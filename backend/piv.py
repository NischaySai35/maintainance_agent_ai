"""
piv.py — Aura Sovereign Dynamic Physical-Inertia Validator (PIV)
================================================================
Rejects readings that violate physical plausibility for each machine.

Key design choices
------------------
* All rate limits are DERIVED from historical data — NOT hardcoded.
  We compute the 99th-percentile rate-of-change from the baseline buffer
  and scale it by a machine-type safety factor.
* Limits scale with regime:
    idle   → strictest   (low-speed transients must be small)
    active → standard
    peak   → most lenient (high RPM machines can shed/absorb energy faster)
* Machine-type modifiers:
    cnc       → tight tolerances  (precision machining)
    pump      → moderate vibration tolerance
    conveyor  → temperature stability, wide RPM range

The validator carries forward the previous valid reading on rejection, so
the pipeline always has a continuous signal.
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

log = logging.getLogger("aura.piv")

# ---------------------------------------------------------------------------
# Safety-factor multipliers applied to the 99th-percentile historical rate
# to derive the maximum allowable rate.
# ---------------------------------------------------------------------------
_REGIME_SAFETY: Dict[str, float] = {
    "idle":   2.5,   # wider tolerance above p99 — occasional valid slow transients
    "active": 3.5,
    "peak":   4.5,   # high-speed machines have faster legitimate transitions
}

# Machine-type multipliers applied on top of regime factor
_MACHINE_TYPE_MOD: Dict[str, float] = {
    "cnc":      1.0,   # precision — no extra leniency
    "pump":     1.3,   # pumps can cavitate / spike transiently
    "conveyor": 1.2,
}

# If fewer than this many rate samples exist, fall back to a sensible default
_MIN_RATE_SAMPLES = 20

# Hardcoded absolute fallbacks (used ONLY if historical calibration unavailable)
_FALLBACK_RATES: Dict[str, float] = {
    "temperature_C":  8.0,   # °C / s
    "vibration_mm_s": 3.0,   # mm/s per s
    "rpm":            900.0,  # rpm / s
    "current_A":      5.0,   # A / s
}


@dataclass
class PIVResult:
    accepted:  bool
    reason:    str
    reading:   dict          # accepted reading (current or previous on reject)
    rates:     Dict[str, float]   # measured rates (for transparency)
    limits:    Dict[str, float]   # applied limits  (for transparency)


class PIVValidator:
    """
    Dynamic Physical-Inertia Validator.

    Call ``calibrate()`` once after baselines are loaded.
    Call ``validate()`` on every live reading.
    """

    def __init__(self) -> None:
        # Per-machine, per-regime, per-sensor max rate
        self._limits: Dict[str, Dict[str, Dict[str, float]]] = {}
        self._calibrated: set[str] = set()

    # -----------------------------------------------------------------------
    # Calibration
    # -----------------------------------------------------------------------

    def calibrate(
        self,
        machine_id:   str,
        machine_type: str,
        rate_data:    Dict[str, Dict[str, List[float]]],
    ) -> None:
        """
        Derive per-sensor rate limits from historical sample buffers.

        Parameters
        ----------
        machine_id   : e.g. 'CNC_01'
        machine_type : 'cnc' | 'pump' | 'conveyor'
        rate_data    : output of BaselineManager.get_rate_data(machine_id)
                       Structure: {regime: {sensor: [values...]}}
        """
        type_mod  = _MACHINE_TYPE_MOD.get(machine_type, 1.0)
        machine_limits: Dict[str, Dict[str, float]] = {}

        for regime in ("idle", "active", "peak"):
            regime_mod = _REGIME_SAFETY.get(regime, 3.0)
            sensors_data = rate_data.get(regime, {})
            sensor_limits: Dict[str, float] = {}

            for sensor in ("temperature_C", "vibration_mm_s", "rpm", "current_A"):
                samples = sensors_data.get(sensor, [])
                limit   = _compute_rate_limit(
                    samples, regime_mod * type_mod, _FALLBACK_RATES[sensor]
                )
                sensor_limits[sensor] = limit

            machine_limits[regime] = sensor_limits

        self._limits[machine_id] = machine_limits
        self._calibrated.add(machine_id)
        log.info(
            "[PIV] Calibrated %s (%s) — limits per regime: %s",
            machine_id, machine_type,
            {r: {s: f"{v:.2f}" for s, v in sl.items()}
             for r, sl in machine_limits.items()},
        )

    # -----------------------------------------------------------------------
    # Validation
    # -----------------------------------------------------------------------

    def validate(
        self,
        current:  dict,
        previous: Optional[dict],
        regime:   str,
    ) -> PIVResult:
        """
        Check whether *current* is physically plausible given *previous*.

        If rejected → carry forward *previous* so the pipeline never stalls.
        If *previous* is None → accept unconditionally (first sample).
        """
        if previous is None:
            return PIVResult(
                accepted = True,
                reason   = "Initial sample — accepted unconditionally",
                reading  = current,
                rates    = {},
                limits   = {},
            )

        machine_id = current.get("machine_id", "")
        limits     = self._get_limits(machine_id, regime)

        dt = _delta_t(current.get("timestamp"), previous.get("timestamp"))
        dt = max(dt, 1e-3)

        sensors = ("temperature_C", "vibration_mm_s", "rpm", "current_A")
        measured_rates: Dict[str, float] = {}

        for sensor in sensors:
            curr_val = float(current.get(sensor, 0.0))
            prev_val = float(previous.get(sensor, 0.0))
            measured_rates[sensor] = abs(curr_val - prev_val) / dt

        # --- Sensor-by-sensor plausibility check ---
        for sensor in sensors:
            rate  = measured_rates[sensor]
            limit = limits.get(sensor, _FALLBACK_RATES[sensor])

            if rate > limit:
                return PIVResult(
                    accepted = False,
                    reason   = (
                        f"PIV rejected {sensor}: "
                        f"rate {rate:.3f}/s > limit {limit:.3f}/s "
                        f"(regime={regime})"
                    ),
                    reading  = previous,   # carry forward last valid
                    rates    = measured_rates,
                    limits   = limits,
                )

        # --- Physically impossible instant RPM collapse check ---
        prev_rpm = float(previous.get("rpm", 0.0))
        curr_rpm = float(current.get("rpm", 0.0))
        if prev_rpm > 500 and curr_rpm == 0.0 and dt <= 2.0:
            return PIVResult(
                accepted = False,
                reason   = (
                    f"PIV rejected {machine_id}: impossible instant RPM→0 "
                    f"from {prev_rpm:.0f} within {dt:.2f}s"
                ),
                reading  = previous,
                rates    = measured_rates,
                limits   = limits,
            )

        return PIVResult(
            accepted = True,
            reason   = f"PIV accepted (regime={regime})",
            reading  = current,
            rates    = measured_rates,
            limits   = limits,
        )

    # -----------------------------------------------------------------------
    # Internals
    # -----------------------------------------------------------------------

    def _get_limits(self, machine_id: str, regime: str) -> Dict[str, float]:
        """Return sensor limits for (machine, regime), falling back to defaults."""
        if machine_id in self._limits:
            return self._limits[machine_id].get(regime, dict(_FALLBACK_RATES))
        return dict(_FALLBACK_RATES)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _compute_rate_limit(
    samples: List[float], safety_factor: float, fallback: float
) -> float:
    """
    Compute max allowable rate from a list of raw sensor values (not rates).
    We derive successive absolute differences (approximating rate at 1 Hz),
    take the 99th percentile, and multiply by the safety factor.
    """
    if len(samples) < _MIN_RATE_SAMPLES:
        # Not enough data — use fallback scaled by safety factor
        return fallback * safety_factor

    diffs = [abs(samples[i] - samples[i - 1]) for i in range(1, len(samples))]
    diffs.sort()
    idx   = min(int(0.99 * len(diffs)), len(diffs) - 1)
    p99   = diffs[idx]
    limit = max(p99 * safety_factor, fallback * 0.5)  # never below half-fallback
    return limit


def _delta_t(ts_curr, ts_prev) -> float:
    """Return time difference in seconds between two ISO-string timestamps."""
    from datetime import datetime, timezone

    def _to_dt(val) -> datetime:
        if isinstance(val, datetime):
            return val
        if isinstance(val, str):
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        return datetime.now(timezone.utc)

    try:
        return (_to_dt(ts_curr) - _to_dt(ts_prev)).total_seconds()
    except Exception:
        return 1.0   # safe default
