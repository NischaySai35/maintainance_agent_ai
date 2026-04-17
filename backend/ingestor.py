"""
ingestor.py — Advanced Machine Learning SSE Ingestion
=====================================================
Pipelines SSE readings through:
PIV -> Dynamic Regimes -> Z-score -> CUSUM -> Feature Extraction 
-> Logistic Regression Risk -> Gemini Agents -> WS Broadcast.
"""
from __future__ import annotations
import asyncio, json, logging, random
from datetime import datetime, timezone
from typing import AsyncIterator, Optional
import httpx

try:
    from .state import AppState, MACHINE_IDS, SIM_BASE_URL
except ImportError:
    from state import AppState, MACHINE_IDS, SIM_BASE_URL
log = logging.getLogger("aura.ingestor")

BACKOFF_BASE, BACKOFF_MAX, BACKOFF_JITTER = 1.0, 10.0, 0.5
DEAD_RECKON_INTERVAL, SSE_CONNECT_TIMEOUT, SSE_READ_TIMEOUT = 1.0, 10.0, 30.0

_SYNTHETIC_BASELINES = {
    "CNC_01": {"temperature_C": 71.0, "vibration_mm_s": 1.8, "rpm": 1450.0, "current_A": 12.4},
    "CNC_02": {"temperature_C": 68.0, "vibration_mm_s": 2.1, "rpm": 1380.0, "current_A": 11.8},
    "PUMP_03": {"temperature_C": 76.0, "vibration_mm_s": 2.6, "rpm": 2820.0, "current_A": 19.6},
    "CONVEYOR_04": {"temperature_C": 44.0, "vibration_mm_s": 1.0, "rpm": 420.0, "current_A": 8.4},
}


def _synthetic_reading(machine_id: str, previous: Optional[dict]) -> dict:
    base = _SYNTHETIC_BASELINES.get(machine_id, _SYNTHETIC_BASELINES["CNC_01"])
    src = previous or base

    def rw(key: str, jitter: float, lo: float, hi: float) -> float:
        val = float(src.get(key, base[key])) + random.uniform(-jitter, jitter)
        return max(lo, min(hi, val))

    return {
        "machine_id": machine_id,
        "temperature_C": round(rw("temperature_C", 0.8, 20.0, 140.0), 2),
        "vibration_mm_s": round(rw("vibration_mm_s", 0.08, 0.0, 12.0), 3),
        "rpm": round(rw("rpm", 22.0, 0.0, 6000.0), 1),
        "current_A": round(rw("current_A", 0.35, 0.0, 300.0), 2),
        "status": "running",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "predicted": True,
    }

async def _sse_events(url: str) -> AsyncIterator[dict]:
    timeout = httpx.Timeout(connect=SSE_CONNECT_TIMEOUT, read=SSE_READ_TIMEOUT, write=10.0, pool=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()
            buffer = ""
            async for raw_chunk in response.aiter_text():
                buffer += raw_chunk
                while "\n\n" in buffer:
                    event_block, buffer = buffer.split("\n\n", 1)
                    for line in event_block.splitlines():
                        if line.strip().startswith("data:"):
                            data_str = line.strip()[5:].strip()
                            if data_str:
                                try: yield json.loads(data_str)
                                except json.JSONDecodeError as exc: log.warning(f"Parse err: {exc}")

async def _process_reading(reading: dict, previous: Optional[dict], app: AppState) -> dict:
    machine_id = reading["machine_id"]
    
    # 1. Regime prediction
    regime = app.ml_model.predict_regime(machine_id, float(reading.get("rpm", 0.0)))
    
    # 2. PIV Validation
    piv_result = app.piv.validate(reading, previous, regime)
    accepted = piv_result.reading

    # 3. Baseline & Z-Scores
    if piv_result.accepted and not reading.get("predicted", False):
        app.baseline.update(accepted, regime)
    baseline = app.baseline.get_baseline(machine_id, regime)
    
    # Pre-calculate internal Z-scores for CUSUM
    sens_map = {"temperature_C": baseline.temperature, "vibration_mm_s": baseline.vibration, 
                "rpm": baseline.rpm, "current_A": baseline.current}
    z_scores_raw = {s: (float(accepted.get(s, 0.0)) - stats.mean) / max(stats.std, 1e-9) 
                    for s, stats in sens_map.items()}
    
    # 4. CUSUM
    current_cusum = app.cusum.update(machine_id, z_scores_raw)
    drifting_sensors = app.cusum.detect_drift(machine_id, current_cusum)
    
    # 5. Anomaly Detection
    anomaly = app.detector.detect(accepted, baseline, drifting_sensors, previous)
    
    # Tracking duration for ML feature
    snap = app.snapshots.get(machine_id)
    duration_ticks = 0
    if snap:
        if anomaly.anomaly_types:
            snap.risk_score += 1 # Temp placeholder to track duration internally (wait, better to add explicit field. Using snap dict as object).
            duration_ticks = getattr(snap, "_duration_ticks", 0) + 1
            setattr(snap, "_duration_ticks", duration_ticks)
        else:
            setattr(snap, "_duration_ticks", 0)

    # 6. ML Feature Extraction & Inference
    features = {
        "z_temp": abs(z_scores_raw["temperature_C"]),
        "z_vibration": abs(z_scores_raw["vibration_mm_s"]),
        "z_rpm": abs(z_scores_raw["rpm"]),
        "z_current": abs(z_scores_raw["current_A"]),
        "cusum_temp": current_cusum.get("temperature_C", 0),
        "cusum_vibration": current_cusum.get("vibration_mm_s", 0),
        "rate_temp": anomaly.rates.get("temperature_C", 0),
        "rate_vibration": anomaly.rates.get("vibration_mm_s", 0),
        "sensor_count": len(anomaly.affected_sensors),
        "duration": duration_ticks,
        "regime_id": 0 if regime == "idle" else (1 if regime == "active" else 2)
    }
    
    multi_anomaly = len(anomaly.affected_sensors) >= 2
    high_curr = float(accepted.get("current_A", 0)) > 15.0
    
    _, risk_score = app.ml_model.predict_risk(features, multi_anomaly, high_curr, not piv_result.accepted)

    # 7. Agent War Room
    decision = app.explainer.reason(
        machine_id=machine_id, piv_result=piv_result, baseline=baseline, 
        anomaly=anomaly, risk_score=risk_score, duration=duration_ticks
    )

    # 8. Action Layer
    action_result = await app.actions.process(
        machine_id=machine_id, risk_score=risk_score, anomaly_types=anomaly.anomaly_types,
        reading=accepted, z_scores=anomaly.z_scores, explanation=decision.explanation
    )

    # 9. State update & Broadcast
    if snap:
        snap.timestamp = str(accepted.get("timestamp", ""))
        snap.temperature_C = float(accepted.get("temperature_C", 0))
        snap.vibration_mm_s = float(accepted.get("vibration_mm_s", 0))
        snap.rpm = float(accepted.get("rpm", 0))
        snap.current_A = float(accepted.get("current_A", 0))
        snap.status = str(accepted.get("status", "unknown"))
        snap.regime = regime
        snap.predicted = bool(reading.get("predicted", False))
        snap.piv_accepted = piv_result.accepted
        snap.piv_reason = piv_result.reason
        snap.anomaly_types = anomaly.anomaly_types
        snap.z_scores = anomaly.z_scores
        snap.cusum_values = current_cusum
        snap.risk_score = risk_score
        snap.explanation = decision.explanation
        snap.alert_sent = "alert" in action_result.get("action", "")
        snap.maintenance_sent = "maintenance" in action_result.get("action", "")

    payload = {
        "event": "machine_update",
        "machine_id": machine_id, "timestamp": snap.timestamp if snap else "",
        "reading": {
            "temperature_C": float(accepted.get("temperature_C", 0)),
            "vibration_mm_s": float(accepted.get("vibration_mm_s", 0)),
            "rpm": float(accepted.get("rpm", 0)),
            "current_A": float(accepted.get("current_A", 0)),
            "status": str(accepted.get("status", "unknown")),
            "predicted": reading.get("predicted", False),
        },
        "regime": regime, "piv_accepted": piv_result.accepted, "piv_reason": piv_result.reason,
        "anomaly_types": anomaly.anomaly_types, "z_scores": anomaly.z_scores,
        "affected_sensors": anomaly.affected_sensors, "cusum_values": current_cusum,
        "risk_score": risk_score, "duration_ticks": duration_ticks,
        "explanation": decision.explanation, "action": action_result,
        "reasoning": {
            "sentinel": decision.sentinel, "physicist": decision.physicist,
            "historian": decision.historian, "orchestrator": decision.orchestrator, "final": decision.final_decision
        }
    }
    await app.broadcast(payload)
    return payload

async def _consume_machine(machine_id: str, app: AppState) -> None:
    url = f"{SIM_BASE_URL}/stream/{machine_id}" if SIM_BASE_URL else ""
    delay = BACKOFF_BASE
    previous = None
    first_reconnect = False

    if not SIM_BASE_URL:
        log.info("[Ingestor] %s running in synthetic-only mode (SIM_BASE_URL unset)", machine_id)
        while True:
            predicted = app.shadow.predict(machine_id)
            if predicted is None:
                predicted = _synthetic_reading(machine_id, previous)

            predicted.setdefault("machine_id", machine_id)
            try:
                await _process_reading(predicted, previous, app)
                previous = predicted
            except Exception as pipe_exc:
                log.debug(f"Dead-reckon err: {pipe_exc}")
            await asyncio.sleep(DEAD_RECKON_INTERVAL)

    while True:
        try:
            async for raw in _sse_events(url):
                raw.setdefault("machine_id", machine_id)
                if first_reconnect and app.shadow.has_state(machine_id):
                    anomaly_flag, dev, expl = app.shadow.check_reconnect_deviation(machine_id, raw)
                    if anomaly_flag: raw["reconnect_anomaly"], raw["reconnect_explanation"] = True, expl
                    first_reconnect = False
                app.shadow.record_actual(raw)
                await _process_reading(raw, previous, app)
                previous = raw
                delay = BACKOFF_BASE

        except Exception as exc:
            log.warning("[Ingestor] %s stream unavailable at %s (%s). Using shadow/synthetic fallback.", machine_id, url, exc)
            first_reconnect = True
            loop = asyncio.get_event_loop()
            end_time = loop.time() + delay
            while loop.time() < end_time:
                predicted = app.shadow.predict(machine_id)
                if predicted is None:
                    predicted = _synthetic_reading(machine_id, previous)

                predicted.setdefault("machine_id", machine_id)
                try:
                    await _process_reading(predicted, previous, app)
                    previous = predicted
                except Exception as pipe_exc:
                    log.debug(f"Dead-reckon err: {pipe_exc}")
                await asyncio.sleep(DEAD_RECKON_INTERVAL)
            delay = min(delay * 2.0 + random.uniform(0.0, BACKOFF_JITTER), BACKOFF_MAX)

async def start_all_ingestion(app: AppState) -> None:
    for machine_id in MACHINE_IDS:
        task = asyncio.create_task(_consume_machine(machine_id, app), name=f"ingestor_{machine_id}")
        app.ingestor_tasks[machine_id] = task
