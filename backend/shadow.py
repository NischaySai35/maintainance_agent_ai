"""
shadow.py — Aura Sovereign Shadow-State Recovery (Dead Reckoning)
=================================================================
When an SSE connection drops, the Shadow State Manager:
  1. Stores the last known sensor values + estimated trend for each machine.
  2. Extrapolates future values using linear dead-reckoning.
  3. On reconnection, compares the first actual reading against the prediction
     and flags a reconnection anomaly if the deviation is significant.

The predicted readings are tagged ``predicted=True`` so the frontend and
anomaly pipeline can treat them with appropriate uncertainty.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple

log = logging.getLogger("aura.shadow")

# Threshold: if actual deviates from prediction by more than this fraction,
# raise a reconnect anomaly.
RECONNECT_DEVIATION_THRESHOLD = 0.20   # 20 %

# Sensors we dead-reckon on
SENSORS = ("temperature_C", "vibration_mm_s", "rpm", "current_A")


@dataclass
class _KnownState:
    """Last-known values + trend estimate for one machine."""

    timestamp:    float = 0.0   # epoch seconds
    temperature:  float = 0.0
    vibration:    float = 0.0
    rpm:          float = 0.0
    current:      float = 0.0
    status:       str   = "running"

    # Per-sensor trends (units/second) — estimated from last two readings
    d_temperature: float = 0.0
    d_vibration:   float = 0.0
    d_rpm:         float = 0.0
    d_current:     float = 0.0


class ShadowStateManager:
    """
    Maintains dead-reckoning state for each machine in the fleet.

    Thread/concurrency note: this class is purely synchronous and must be
    called only from within the single asyncio event loop.  No locking needed.
    """

    def __init__(self) -> None:
        self._states: Dict[str, _KnownState] = {}
        self._prev:   Dict[str, _KnownState] = {}   # penultimate reading for trend

    # -----------------------------------------------------------------------
    # Update with an actual reading
    # -----------------------------------------------------------------------

    def record_actual(self, reading: dict) -> None:
        """
        Store a fresh validated reading as the new known state and compute
        the per-sensor trend relative to the previous known state.
        """
        mid = reading.get("machine_id", "")
        if not mid:
            return

        ts = _epoch(reading.get("timestamp"))
        curr = _KnownState(
            timestamp   = ts,
            temperature = float(reading.get("temperature_C",  0.0)),
            vibration   = float(reading.get("vibration_mm_s", 0.0)),
            rpm         = float(reading.get("rpm",            0.0)),
            current     = float(reading.get("current_A",      0.0)),
            status      = reading.get("status", "running"),
        )

        # Compute trends from previous → current
        prev = self._states.get(mid)
        if prev is not None:
            dt = max(curr.timestamp - prev.timestamp, 1e-3)
            curr.d_temperature = (curr.temperature - prev.temperature) / dt
            curr.d_vibration   = (curr.vibration   - prev.vibration)   / dt
            curr.d_rpm         = (curr.rpm         - prev.rpm)         / dt
            curr.d_current     = (curr.current     - prev.current)     / dt
        else:
            # No previous — trends stay 0 (first ever reading for this machine)
            pass

        self._prev[mid]   = self._states.get(mid, curr)
        self._states[mid] = curr

    # -----------------------------------------------------------------------
    # Dead-reckoning during disconnection
    # -----------------------------------------------------------------------

    def predict(self, machine_id: str) -> Optional[dict]:
        """
        Return a predicted sensor dict for *now* by linearly extrapolating
        from the last known state.  Returns None if no state is known yet.
        """
        ks = self._states.get(machine_id)
        if ks is None:
            return None

        now  = datetime.now(timezone.utc)
        ts   = now.timestamp()
        dt   = max(ts - ks.timestamp, 0.0)

        # Clamp drift — do not extrapolate indefinitely; cap at 60 s
        dt = min(dt, 60.0)

        pred: dict = {
            "machine_id":     machine_id,
            "timestamp":      now.isoformat(),
            "temperature_C":  max(0.0, ks.temperature + ks.d_temperature * dt),
            "vibration_mm_s": max(0.0, ks.vibration   + ks.d_vibration   * dt),
            "rpm":            max(0.0, ks.rpm          + ks.d_rpm         * dt),
            "current_A":      max(0.0, ks.current      + ks.d_current     * dt),
            "status":         ks.status,
            "predicted":      True,
        }
        log.debug("[Shadow] %s — dead-reckoned (dt=%.1fs)", machine_id, dt)
        return pred

    # -----------------------------------------------------------------------
    # Reconnection validation
    # -----------------------------------------------------------------------

    def check_reconnect_deviation(
        self, machine_id: str, actual: dict
    ) -> Tuple[bool, float, str]:
        """
        Compare the first actual reading after reconnection against what we
        predicted while the stream was down.

        Returns
        -------
        (anomaly: bool, max_deviation: float, explanation: str)
          anomaly         — True if deviation exceeds threshold
          max_deviation   — largest fractional deviation across sensors
          explanation     — human-readable description of the discrepancy
        """
        predicted = self.predict(machine_id)
        if predicted is None:
            return False, 0.0, "No shadow state available for comparison"

        pairs = {
            "temperature_C":  ("temperature_C",  predicted["temperature_C"]),
            "vibration_mm_s": ("vibration_mm_s", predicted["vibration_mm_s"]),
            "rpm":            ("rpm",             predicted["rpm"]),
            "current_A":      ("current_A",       predicted["current_A"]),
        }

        deviations: Dict[str, float] = {}
        for sensor, (key, pred_val) in pairs.items():
            actual_val = float(actual.get(key, 0.0))
            divisor    = max(abs(pred_val), 1e-6)
            deviations[sensor] = abs(actual_val - pred_val) / divisor

        max_dev    = max(deviations.values())
        worst_sens = max(deviations, key=deviations.get)  # type: ignore[arg-type]
        anomaly    = max_dev > RECONNECT_DEVIATION_THRESHOLD

        explanation = (
            f"Reconnection deviation on {machine_id}: "
            f"worst sensor={worst_sens} ({deviations[worst_sens]:.1%} from predicted). "
        )
        if anomaly:
            explanation += (
                "Exceeds threshold — possible state change during outage."
            )
        else:
            explanation += "Within acceptable bounds — stream resumed normally."

        return anomaly, max_dev, explanation

    # -----------------------------------------------------------------------
    # Utility
    # -----------------------------------------------------------------------

    def has_state(self, machine_id: str) -> bool:
        return machine_id in self._states


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def _epoch(ts_value) -> float:
    """Convert a timestamp (ISO string, datetime, or numeric epoch) to epoch float."""
    if isinstance(ts_value, (int, float)):
        return float(ts_value)
    if isinstance(ts_value, datetime):
        return ts_value.timestamp()
    if isinstance(ts_value, str):
        try:
            dt = datetime.fromisoformat(ts_value.replace("Z", "+00:00"))
            return dt.timestamp()
        except ValueError:
            pass
    return datetime.now(timezone.utc).timestamp()
