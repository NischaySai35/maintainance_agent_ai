"""
detector.py — Advanced Sentinel Anomaly Detector
================================================
Evaluates Z-scores, triggers CUSUM tracking, and synthesizes 
Spike, Drift, and Compound anomalies dynamically.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

try:
    from .baseline import RegimeBaseline
except ImportError:
    from baseline import RegimeBaseline

log = logging.getLogger("aura.detector")

SPIKE_Z_THRESHOLD: float = 3.0
COMPOUND_Z_THRESHOLD: float = 2.2
SENSORS = ("temperature_C", "vibration_mm_s", "rpm", "current_A")

@dataclass
class AnomalyResult:
    machine_id:       str
    anomaly_types:    List[str]             = field(default_factory=list)
    z_scores:         Dict[str, float]      = field(default_factory=dict)
    affected_sensors: List[str]             = field(default_factory=list)
    rates:            Dict[str, float]      = field(default_factory=dict)

class AnomalyDetector:
    def detect(self, reading: dict, baseline: RegimeBaseline, drifting_sensors: List[str], prev_reading: dict = None) -> AnomalyResult:
        mid = reading.get("machine_id", "unknown")
        
        z_abs: Dict[str, float] = {}
        sensor_map = {
            "temperature_C":  baseline.temperature,
            "vibration_mm_s": baseline.vibration,
            "rpm":            baseline.rpm,
            "current_A":      baseline.current,
        }

        for sensor, stats in sensor_map.items():
            val  = float(reading.get(sensor, 0.0))
            denom = max(stats.std, 1e-9)
            z_abs[sensor] = abs((val - stats.mean) / denom)

        spike_sensors = [s for s in SENSORS if z_abs[s] > SPIKE_Z_THRESHOLD]
        compound_sensors = [s for s in SENSORS if z_abs[s] > COMPOUND_Z_THRESHOLD]

        anomaly_types = []
        affected = set()

        if spike_sensors:
            anomaly_types.append("spike")
            affected.update(spike_sensors)

        if drifting_sensors:
            anomaly_types.append("drift")
            affected.update(drifting_sensors)

        if len(compound_sensors) >= 2:
            anomaly_types.append("compound")
            affected.update(compound_sensors)

        rates = {}
        import math
        if prev_reading:
            for s in SENSORS:
                rates[s] = abs(reading.get(s, 0.0) - prev_reading.get(s, 0.0))
        else:
            rates = {s: 0.0 for s in SENSORS}

        return AnomalyResult(
            machine_id=mid,
            anomaly_types=anomaly_types,
            z_scores={s: round(v, 4) for s, v in z_abs.items()},
            affected_sensors=list(affected),
            rates=rates
        )
