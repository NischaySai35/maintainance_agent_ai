"""
actions.py — Aura Sovereign Action Layer
=========================================
Evaluates the risk score for each pipeline tick and triggers the appropriate
action against the simulation server (localhost:3000).

Decision table
--------------
  Risk < 40          → log only (no HTTP call)
  40  ≤ Risk < 70    → POST /alert
  Risk ≥ 70          → POST /alert  +  POST /schedule-maintenance

Every outbound payload includes:
  machine_id, anomaly_type, all sensor values, Z-scores, risk score, timestamp

HTTP calls are made with httpx (pure-Python async client) — no C compiler
required on any platform.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx

log = logging.getLogger("aura.actions")

# ---------------------------------------------------------------------------
# Action thresholds
# ---------------------------------------------------------------------------
THRESHOLD_ALERT:       float = 40.0
THRESHOLD_MAINTENANCE: float = 70.0

# Simulation server base URL
SIM_BASE_URL: str = "http://localhost:3000"


class ActionLayer:
    """
    Async action dispatcher.  Keeps in-memory logs of all alerts and
    maintenance events dispatched during the current session.
    """

    def __init__(self, sim_base_url: str = SIM_BASE_URL) -> None:
        self._base       = sim_base_url.rstrip("/")
        self.alert_log:       List[dict] = []
        self.maintenance_log: List[dict] = []

    # -----------------------------------------------------------------------
    # Primary entry point called by the pipeline per tick
    # -----------------------------------------------------------------------

    async def process(
        self,
        *,
        machine_id:    str,
        risk_score:    float,
        anomaly_types: List[str],
        reading:       dict,
        z_scores:      Dict[str, float],
        explanation:   str,
    ) -> dict:
        """
        Evaluate *risk_score* and fire the appropriate HTTP requests.
        Returns a summary dict describing which actions were taken.
        """
        actions_taken: List[str] = []
        anomaly_type  = ", ".join(anomaly_types) if anomaly_types else "none"
        ts            = reading.get("timestamp", datetime.now(timezone.utc).isoformat())

        if risk_score < THRESHOLD_ALERT:
            log.debug("[Actions] %s — risk=%.1f → log only", machine_id, risk_score)
            return {
                "action":     "log_only",
                "risk_score": risk_score,
                "machine_id": machine_id,
            }

        # Build the core alert payload
        alert_payload = _build_alert_payload(
            machine_id    = machine_id,
            anomaly_type  = anomaly_type,
            reading       = reading,
            z_scores      = z_scores,
            risk_score    = risk_score,
            timestamp     = ts,
            explanation   = explanation,
        )

        # Always POST /alert when risk ≥ 40
        await self._post_alert(alert_payload)
        actions_taken.append("alert")

        # Also POST /schedule-maintenance when risk ≥ 70
        if risk_score >= THRESHOLD_MAINTENANCE:
            maint_payload = _build_maintenance_payload(
                machine_id   = machine_id,
                anomaly_type = anomaly_type,
                risk_score   = risk_score,
                timestamp    = ts,
                explanation  = explanation,
            )
            await self._post_maintenance(maint_payload)
            actions_taken.append("schedule_maintenance")

        return {
            "action":       "+".join(actions_taken),
            "risk_score":   risk_score,
            "machine_id":   machine_id,
            "anomaly_type": anomaly_type,
        }

    # -----------------------------------------------------------------------
    # Manual endpoints (called by FastAPI routes for operator overrides)
    # -----------------------------------------------------------------------

    async def post_alert_manual(
        self,
        machine_id: str,
        message:    str,
        risk_score: float,
        category:   str = "manual",
    ) -> dict:
        payload = {
            "machine_id": machine_id,
            "message":    message,
            "risk_score": risk_score,
            "category":   category,
            "timestamp":  datetime.now(timezone.utc).isoformat(),
        }
        await self._post_alert(payload)
        return payload

    async def post_maintenance_manual(
        self,
        machine_id: str,
        risk_score: float,
        reason:     str,
    ) -> dict:
        payload = _build_maintenance_payload(
            machine_id   = machine_id,
            anomaly_type = "manual",
            risk_score   = risk_score,
            timestamp    = datetime.now(timezone.utc).isoformat(),
            explanation  = reason,
        )
        await self._post_maintenance(payload)
        return payload

    # -----------------------------------------------------------------------
    # Internal HTTP helpers (httpx async)
    # -----------------------------------------------------------------------

    async def _post_alert(self, payload: dict) -> None:
        """POST payload to /alert on the simulation server."""
        url = f"{self._base}/alert"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, json=payload)
            log.info(
                "[Actions] POST /alert → %d | %s | risk=%.1f",
                resp.status_code,
                payload.get("machine_id"),
                payload.get("risk_score", 0),
            )
        except Exception as exc:
            log.warning("[Actions] POST /alert failed (%s) — buffered locally", exc)

        # Buffer locally regardless of HTTP outcome
        self.alert_log.append(payload)
        if len(self.alert_log) > 500:
            self.alert_log = self.alert_log[-500:]

    async def _post_maintenance(self, payload: dict) -> None:
        """POST payload to /schedule-maintenance on the simulation server."""
        url = f"{self._base}/schedule-maintenance"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, json=payload)
            log.info(
                "[Actions] POST /schedule-maintenance → %d | %s | risk=%.1f",
                resp.status_code,
                payload.get("machine_id"),
                payload.get("risk_score", 0),
            )
        except Exception as exc:
            log.warning(
                "[Actions] POST /schedule-maintenance failed (%s) — buffered locally", exc
            )

        self.maintenance_log.append(payload)
        if len(self.maintenance_log) > 500:
            self.maintenance_log = self.maintenance_log[-500:]


# ---------------------------------------------------------------------------
# Payload builders
# ---------------------------------------------------------------------------

def _build_alert_payload(
    *,
    machine_id:   str,
    anomaly_type: str,
    reading:      dict,
    z_scores:     Dict[str, float],
    risk_score:   float,
    timestamp:    str,
    explanation:  str,
) -> dict:
    return {
        "machine_id":     machine_id,
        "anomaly_type":   anomaly_type,
        "timestamp":      timestamp,
        "risk_score":     risk_score,
        "reason":         explanation,
        # Full sensor snapshot
        "temperature_C":  reading.get("temperature_C"),
        "vibration_mm_s": reading.get("vibration_mm_s"),
        "rpm":            reading.get("rpm"),
        "current_A":      reading.get("current_A"),
        "status":         reading.get("status"),
        # Per-sensor Z-scores
        "z_scores":       z_scores,
        "category":       _categorise(risk_score),
    }


def _build_maintenance_payload(
    *,
    machine_id:   str,
    anomaly_type: str,
    risk_score:   float,
    timestamp:    str,
    explanation:  str,
) -> dict:
    return {
        "machine_id":   machine_id,
        "anomaly_type": anomaly_type,
        "risk_score":   risk_score,
        "timestamp":    timestamp,
        "reason":       explanation,
        "status":       "scheduled",
        "priority":     "immediate" if risk_score >= 85 else "high",
    }


def _categorise(risk_score: float) -> str:
    if risk_score >= THRESHOLD_MAINTENANCE:
        return "critical"
    if risk_score >= THRESHOLD_ALERT:
        return "warning"
    return "info"
