"""Action manager — handles alerts and maintenance scheduling.

All records are kept in memory for the running process.  In a production
system these would be persisted to a database (e.g. TimescaleDB).
"""
from __future__ import annotations

from datetime import UTC, datetime

from backend.models.schemas import AlertRequest, ScheduleRequest


class ActionManager:
    """Logs alerts and scheduled maintenance events."""

    def __init__(self) -> None:
        self.alert_log: list[dict] = []
        self.scheduled: list[dict] = []

    def post_alert(self, request: AlertRequest) -> dict:
        """Record an alert and return the stored payload."""
        payload = {
            "timestamp": datetime.now(UTC).isoformat(),
            "machine_id": request.machine_id,
            "message": request.message,
            "risk_score": request.risk_score,
            "category": request.category,
        }
        self.alert_log.append(payload)
        return payload

    def schedule(self, request: ScheduleRequest) -> dict:
        """Record a maintenance schedule entry and return it."""
        payload = {
            "timestamp": datetime.now(UTC).isoformat(),
            "machine_id": request.machine_id,
            "risk_score": request.risk_score,
            "reason": request.reason,
            "status": "scheduled",
        }
        self.scheduled.append(payload)
        return payload
