"""Anomaly detector — identifies spikes, drifts, and compound anomalies
using z-score analysis and moving-average deviation.
"""
from __future__ import annotations

from backend.models.schemas import AnomalyFinding, BaselineStats, SensorReading


class AnomalyDetector:
    """Detect multiple anomaly types from a validated reading + baseline.

    Anomaly types
    -------------
    spike   — at least one sensor exceeds 3 standard deviations from its mean.
    drift   — sensor is trending upward *and* has moved away from its rolling mean.
    compound — two or more sensors simultaneously exceed 2.2 standard deviations.
    """

    # z-score thresholds
    SPIKE_Z = 3.0
    COMPOUND_Z = 2.2

    # drift: minimum per-sample upward trend + minimum offset from rolling mean
    DRIFT_TEMP_TREND = 0.04    # °C / sample
    DRIFT_TEMP_OFFSET = 2.5    # °C above rolling mean
    DRIFT_VIB_TREND = 0.01     # g / sample
    DRIFT_VIB_OFFSET = 0.4     # g above rolling mean

    def detect(
        self, reading: SensorReading, baseline: BaselineStats
    ) -> AnomalyFinding:
        z_t = abs((reading.temperature - baseline.mean_temperature) / baseline.std_temperature)
        z_v = abs((reading.vibration - baseline.mean_vibration) / baseline.std_vibration)
        z_r = abs((reading.rpm - baseline.mean_rpm) / baseline.std_rpm)

        ma_t = abs(reading.temperature - baseline.rolling_temperature)
        ma_v = abs(reading.vibration - baseline.rolling_vibration)
        ma_r = abs(reading.rpm - baseline.rolling_rpm)

        anomaly_types: list[str] = []

        # --- Spike detection ---
        if z_t > self.SPIKE_Z or z_v > self.SPIKE_Z or z_r > self.SPIKE_Z:
            anomaly_types.append("spike")

        # --- Drift detection ---
        temp_drifting = (
            baseline.trend_temperature > self.DRIFT_TEMP_TREND
            and reading.temperature > baseline.rolling_temperature + self.DRIFT_TEMP_OFFSET
        )
        vib_drifting = (
            baseline.trend_vibration > self.DRIFT_VIB_TREND
            and reading.vibration > baseline.rolling_vibration + self.DRIFT_VIB_OFFSET
        )
        if temp_drifting or vib_drifting:
            anomaly_types.append("drift")

        # --- Compound detection (multi-sensor) ---
        abnormal_axes = sum([z_t > self.COMPOUND_Z, z_v > self.COMPOUND_Z, z_r > self.COMPOUND_Z])
        if abnormal_axes >= 2:
            anomaly_types.append("compound")

        # Raw score hint: contribution from z-scores + multi-axis penalty
        score_hint = min(100.0, (z_t + z_v + z_r) * 10.0 + abnormal_axes * 8.0)

        return AnomalyFinding(
            machine_id=reading.machine_id,
            anomaly_types=anomaly_types,
            zscores={"temperature": z_t, "vibration": z_v, "rpm": z_r},
            moving_deviation={"temperature": ma_t, "vibration": ma_v, "rpm": ma_r},
            score_hint=score_hint,
        )
