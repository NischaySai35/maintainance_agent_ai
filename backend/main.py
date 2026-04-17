"""
main.py — Aura Sovereign FastAPI Application Entry Point
=========================================================
"""
from __future__ import annotations

import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncIterator
import pandas as pd
import httpx
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from actions  import ActionLayer
from agent    import LLMExplainer
from baseline import BaselineManager
from detector import AnomalyDetector
from ingestor import start_all_ingestion
from piv      import PIVValidator
from shadow   import ShadowStateManager
from cusum    import CusumDetector
from model    import MLIntelligence
from state    import (
    AppState,
    MACHINE_IDS,
    MACHINE_TYPE,
    SIM_BASE_URL,
    app_state,
)

logging.basicConfig(
    stream  = sys.stdout,
    level   = logging.INFO,
    format  = "%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt = "%H:%M:%S",
)
log = logging.getLogger("aura.main")

class AlertRequest(BaseModel):
    machine_id: str
    message:    str
    risk_score: float
    category:   str = "manual"

class ScheduleRequest(BaseModel):
    machine_id: str
    risk_score: float
    reason:     str

async def _fetch_history(machine_id: str, client: httpx.AsyncClient) -> list[dict]:
    url = f"{SIM_BASE_URL}/history/{machine_id}"
    try:
        resp = await client.get(url)
        if resp.status_code == 200:
            data = resp.json()
            readings = data.get("readings", []) if isinstance(data, dict) else data
            log.info("[Bootstrap] %s — fetched %d historical readings", machine_id, len(readings))
            return readings if isinstance(readings, list) else []
        log.warning("[Bootstrap] %s — /history HTTP %d", machine_id, resp.status_code)
        return []
    except Exception as exc:
        log.warning("[Bootstrap] %s — /history unreachable (%s)", machine_id, exc)
        return []

async def _bootstrap(app: AppState) -> None:
    log.info("[Bootstrap] Fetching 7-day history for all machines…")

    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks   = [_fetch_history(mid, client) for mid in MACHINE_IDS]
        results = await asyncio.gather(*tasks)

    history_by_machine = {m: h for m, h in zip(MACHINE_IDS, results)}

    # Train Regimes (KMeans)
    app.ml_model.train_regimes(history_by_machine)

    features_list = []
    labels_list = []

    for machine_id, history in history_by_machine.items():
        # Load baselines correctly
        app.baseline.load_history(machine_id, history, app.ml_model.predict_regime)

        z_scores_hist = {"temperature_C": [], "vibration_mm_s": [], "rpm": [], "current_A": []}
        for r in history:
            reg = app.ml_model.predict_regime(machine_id, float(r.get("rpm", 0)))
            bl = app.baseline.get_baseline(machine_id, reg)
            for s in z_scores_hist.keys():
                z = (float(r.get(s, 0)) - bl.get(s).mean) / max(bl.get(s).std, 1e-9)
                z_scores_hist[s].append(z)

        # CUSUM Threshold training
        app.cusum.calculate_historical_thresholds(machine_id, z_scores_hist)

        # Calibrate PIV Limits dynamically
        rate_data = app.baseline.get_rate_data(machine_id)
        app.piv.calibrate(machine_id, MACHINE_TYPE.get(machine_id, "cnc"), rate_data)

        # Second Pass over history for Risk ML (Logistic Regression) Dataset preparation
        app.cusum.S[machine_id] = {s: 0.0 for s in z_scores_hist.keys()}
        prev = None
        duration = 0

        for r in history:
            reg = app.ml_model.predict_regime(machine_id, float(r.get("rpm", 0)))
            bl = app.baseline.get_baseline(machine_id, reg)
            
            z_abs, z_raw = {}, {}
            for s in z_scores_hist.keys():
                z = (float(r.get(s, 0)) - bl.get(s).mean) / max(bl.get(s).std, 1e-9)
                z_raw[s], z_abs[s] = z, abs(z)
                
            cur_cusum = app.cusum.update(machine_id, z_raw)
            drifting = app.cusum.detect_drift(machine_id, cur_cusum)
            
            rates = {s: abs(float(r.get(s, 0)) - float(prev.get(s, 0))) if prev else 0.0 for s in z_scores_hist.keys()}
            
            spike = [s for s, z in z_abs.items() if z > 3.0]
            compound = sum(1 for z in z_abs.values() if z > 2.2) >= 2
            
            is_anomaly = bool(spike) or bool(drifting) or compound
            duration = duration + 1 if is_anomaly else 0

            feat = [
                z_abs["temperature_C"], z_abs["vibration_mm_s"], z_abs["rpm"], z_abs["current_A"],
                cur_cusum["temperature_C"], cur_cusum["vibration_mm_s"],
                rates["temperature_C"], rates["vibration_mm_s"],
                len(set(spike + drifting)), duration,
                0 if reg == "idle" else (1 if reg == "active" else 2)
            ]
            features_list.append(feat)
            labels_list.append(1 if is_anomaly else 0)
            prev = r

    if features_list:
        df_X = pd.DataFrame(features_list)
        series_y = pd.Series(labels_list)
        app.ml_model.train_risk_model(df_X, series_y)

    log.info("[Bootstrap] Complete for: %s", app.baseline.all_machines_loaded())

@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    app_state.baseline  = BaselineManager()
    app_state.piv       = PIVValidator()
    app_state.detector  = AnomalyDetector()
    app_state.shadow    = ShadowStateManager()
    app_state.actions   = ActionLayer(sim_base_url=SIM_BASE_URL)
    app_state.explainer = LLMExplainer()
    app_state.cusum     = CusumDetector()
    app_state.ml_model  = MLIntelligence()

    await _bootstrap(app_state)
    await start_all_ingestion(app_state)
    yield
    for task in app_state.ingestor_tasks.values(): task.cancel()
    await asyncio.gather(*app_state.ingestor_tasks.values(), return_exceptions=True)

app = FastAPI(title="Aura Sovereign", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/")
async def root(): return {"system": "Aura Sovereign", "active_consumers": list(app_state.ingestor_tasks.keys())}

@app.get("/state")
async def get_state() -> dict:
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "machines": {
            mid: {
                "machine_id":      snap.machine_id,
                "timestamp":       snap.timestamp,
                "temperature_C":   snap.temperature_C,
                "vibration_mm_s":  snap.vibration_mm_s,
                "rpm":             snap.rpm,
                "current_A":       snap.current_A,
                "status":          snap.status,
                "regime":          snap.regime,
                "predicted":       snap.predicted,
                "piv_accepted":    snap.piv_accepted,
                "piv_reason":      snap.piv_reason,
                "anomaly_types":   snap.anomaly_types,
                "z_scores":        snap.z_scores,
                "cusum_values":    snap.cusum_values,
                "risk_score":      snap.risk_score,
                "explanation":     snap.explanation,
            } for mid, snap in app_state.snapshots.items()
        },
        "alerts": list(app_state.actions.alert_log[-50:]) if app_state.actions else [],
        "maintenance_events": list(app_state.actions.maintenance_log[-50:]) if app_state.actions else [],
    }

@app.post("/alert")
async def post_alert(request: AlertRequest) -> dict:
    res = await app_state.actions.post_alert_manual(request.machine_id, request.message, request.risk_score, request.category)
    await app_state.broadcast({"event": "manual_alert", **res})
    return res

@app.post("/schedule-maintenance")
async def schedule_maintenance(request: ScheduleRequest) -> dict:
    res = await app_state.actions.post_maintenance_manual(request.machine_id, request.risk_score, request.reason)
    await app_state.broadcast({"event": "manual_maintenance", **res})
    return res

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await app_state.connect_ws(websocket)
    try:
        await websocket.send_json({"event": "initial_snapshot", "timestamp": datetime.now(timezone.utc).isoformat(), "machines": {}})
        while True:
            msg = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
            if msg.lower().strip() == "ping": await websocket.send_text('{"event":"pong"}')
    except asyncio.TimeoutError:
        await websocket.send_text('{"event":"heartbeat"}')
    except Exception: pass
    finally:
        await app_state.disconnect_ws(websocket)
