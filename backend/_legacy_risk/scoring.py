"""Risk scoring and machine priority queue.

Converts raw anomaly findings into a normalised 0–100 risk score and
maintains a priority queue across the fleet.
"""
from __future__ import annotations

from collections import defaultdict

from backend.models.schemas import AnomalyFinding, RiskResult


class RiskScorer:
    """Score each machine's risk and track how long each anomaly persists.

    Score formula
    -------------
    risk = min(100, base * 0.55 + duration_factor + multi_sensor_bonus)

    where:
      base             = AnomalyFinding.score_hint  (z-score derived)
      duration_factor  = min(30, consecutive_ticks * 2)  — reward persistence
      multi_sensor_bonus = 15 if "compound" anomaly present
    """

    def __init__(self) -> None:
        self._duration: dict[str, int] = defaultdict(int)

    def score(self, finding: AnomalyFinding) -> RiskResult:
        mid = finding.machine_id

        if finding.anomaly_types:
            self._duration[mid] += 1
        else:
            self._duration[mid] = 0

        duration = self._duration[mid]
        base = finding.score_hint
        duration_factor = min(30.0, duration * 2.0)
        multi_sensor_bonus = 15.0 if "compound" in finding.anomaly_types else 0.0
        risk_score = min(100.0, base * 0.55 + duration_factor + multi_sensor_bonus)

        return RiskResult(
            machine_id=mid,
            risk_score=round(risk_score, 2),
            duration_seconds=duration,
        )
