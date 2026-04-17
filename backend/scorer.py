"""
scorer.py — Aura Sovereign Orchestrator Risk Scorer
====================================================
Computes a normalised 0-100 risk score per machine by combining:

  Risk = w1 * deviation + w2 * duration_factor + w3 * sensor_count_factor

where:
  deviation          = max absolute Z-score across all affected sensors
  duration_factor    = log-scaled persistence of the current anomaly streak
  sensor_count_factor = number of simultaneously affected sensors (compound signal)

Additional modifiers:
  * current_A signal — motor overload indicator (soft signal)
  * status field     — 'fault' / 'warning' add a small fixed bonus

All weights are normalised so the maximum possible raw sum equals 100.
"""
from __future__ import annotations

import logging
import math
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict

from detector import AnomalyResult

log = logging.getLogger("aura.scorer")

# ---------------------------------------------------------------------------
# Weight configuration (must sum to ≤ 1.0)
# ---------------------------------------------------------------------------
W_DEVIATION: float = 0.50   # contribution from max Z-score
W_DURATION:  float = 0.30   # contribution from anomaly persistence
W_SENSORS:   float = 0.20   # contribution from multi-sensor count

# Saturation points — values at which each component is considered 100 %
MAX_Z:          float = 8.0    # |z| ≥ 8  → deviation component = 100 %
MAX_DURATION:   int   = 60     # 60 consecutive ticks → duration = 100 %
MAX_SENSOR_CNT: int   = 4      # all 4 sensors → sensor component = 100 %

# Current-A overload threshold and bonus cap
CURRENT_OVERLOAD_BONUS:    float = 5.0
CURRENT_OVERLOAD_THRESHOLD: float = 15.0  # Amperes (arbitrary; calibrate to fleet)

# Status signal bonuses
STATUS_BONUSES: Dict[str, float] = {
    "fault":   8.0,
    "warning": 3.0,
    "running": 0.0,
}


@dataclass
class RiskResult:
    machine_id:       str
    risk_score:       float            # 0–100 (rounded to 2 dp)
    duration_ticks:   int              # consecutive anomaly ticks
    component_scores: Dict[str, float] = field(default_factory=dict)
    priority_rank:    int              = 0


class RiskScorer:
    """
    Maintains per-machine anomaly persistence counters and computes risk.

    Usage
    -----
    scorer = RiskScorer()
    result = scorer.score(anomaly_result, reading_dict)
    """

    def __init__(self) -> None:
        self._streak:   Dict[str, int]   = defaultdict(int)   # consecutive anomaly ticks
        self._peak:     Dict[str, float] = defaultdict(float)  # peak risk seen per machine

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------

    def score(self, anomaly: AnomalyResult, reading: dict) -> RiskResult:
        """
        Compute the risk score for one machine tick.

        Parameters
        ----------
        anomaly : AnomalyResult from the Sentinel detector
        reading : validated sensor reading dict (for current_A and status)
        """
        mid = anomaly.machine_id

        # Track anomaly streak
        if anomaly.anomaly_types:
            self._streak[mid] += 1
        else:
            self._streak[mid] = 0

        duration = self._streak[mid]

        # --- Component 1: deviation (max |z| across affected sensors) ---
        max_z = max(anomaly.z_scores.values()) if anomaly.z_scores else 0.0
        dev_component = min(max_z / MAX_Z, 1.0) * 100.0

        # --- Component 2: duration (log-scaled persistence) ---
        # log scaling: first 10 ticks ramp fast, then diminishing returns
        if duration > 0:
            dur_norm = math.log1p(duration) / math.log1p(MAX_DURATION)
            dur_component = min(dur_norm, 1.0) * 100.0
        else:
            dur_component = 0.0

        # --- Component 3: sensor count ---
        n_sensors = len(anomaly.affected_sensors)
        sen_component = min(n_sensors / MAX_SENSOR_CNT, 1.0) * 100.0

        # --- Weighted sum ---
        raw_score = (
            W_DEVIATION * dev_component
            + W_DURATION  * dur_component
            + W_SENSORS   * sen_component
        )

        # --- Modifier 1: current_A motor overload bonus ---
        current_A = float(reading.get("current_A", 0.0))
        if current_A > CURRENT_OVERLOAD_THRESHOLD:
            overload_ratio = min(
                (current_A - CURRENT_OVERLOAD_THRESHOLD) / CURRENT_OVERLOAD_THRESHOLD,
                1.0,
            )
            raw_score += CURRENT_OVERLOAD_BONUS * overload_ratio

        # --- Modifier 2: status field (weak signal) ---
        status = reading.get("status", "running")
        raw_score += STATUS_BONUSES.get(status, 0.0)

        risk_score = round(min(raw_score, 100.0), 2)
        self._peak[mid] = max(self._peak[mid], risk_score)

        log.debug(
            "[Scorer] %s — risk=%.1f  (dev=%.1f, dur=%.1f, sen=%.1f)  streak=%d",
            mid, risk_score, dev_component, dur_component, sen_component, duration,
        )

        return RiskResult(
            machine_id     = mid,
            risk_score     = risk_score,
            duration_ticks = duration,
            component_scores = {
                "deviation":      round(dev_component, 2),
                "duration":       round(dur_component, 2),
                "sensor_count":   round(sen_component, 2),
                "current_bonus":  round(CURRENT_OVERLOAD_BONUS * min(
                    max(current_A - CURRENT_OVERLOAD_THRESHOLD, 0) / max(CURRENT_OVERLOAD_THRESHOLD, 1e-9), 1.0
                ), 2),
                "status_bonus":   STATUS_BONUSES.get(status, 0.0),
            },
        )

    def get_peak(self, machine_id: str) -> float:
        """Return the peak risk score observed for a machine in this session."""
        return self._peak.get(machine_id, 0.0)
