"""Baseline memory — stores historical sensor data and computes dynamic
per-machine baselines (mean, std, rolling averages, trends, regime).
"""
from __future__ import annotations

from collections import deque
from statistics import fmean, pstdev

from backend.models.schemas import BaselineStats, Regime, SensorReading


class BaselineMemory:
    """Maintains a rolling history for every machine and computes statistics
    used by the anomaly detector and agents.

    Parameters
    ----------
    history_window:
        Maximum number of samples kept per machine (~7 days at 1 Hz = 604 800;
        use a smaller default during testing/simulation).
    rolling_window:
        Short window used to compute the rolling mean and detect drift.
    """

    def __init__(
        self,
        history_window: int = 604_800,
        rolling_window: int = 60,
    ) -> None:
        self.history_window = history_window
        self.rolling_window = rolling_window
        self._series: dict[str, deque[SensorReading]] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add(self, reading: SensorReading) -> None:
        """Append a validated reading to the machine's history."""
        if reading.machine_id not in self._series:
            self._series[reading.machine_id] = deque(maxlen=self.history_window)
        self._series[reading.machine_id].append(reading)

    def compute(self, reading: SensorReading) -> BaselineStats:
        """Return the current baseline statistics for the given machine."""
        series = list(self._series.get(reading.machine_id, []))
        if not series:
            series = [reading]

        temps = [s.temperature for s in series]
        vibs = [s.vibration for s in series]
        rpms = [s.rpm for s in series]
        tail = series[-self.rolling_window :]

        return BaselineStats(
            machine_id=reading.machine_id,
            regime=self._classify_regime(reading.rpm),
            mean_temperature=fmean(temps),
            mean_vibration=fmean(vibs),
            mean_rpm=fmean(rpms),
            std_temperature=max(pstdev(temps), 0.01),
            std_vibration=max(pstdev(vibs), 0.01),
            std_rpm=max(pstdev(rpms), 1.0),
            rolling_temperature=fmean([s.temperature for s in tail]),
            rolling_vibration=fmean([s.vibration for s in tail]),
            rolling_rpm=fmean([s.rpm for s in tail]),
            trend_temperature=self._linear_trend(temps),
            trend_vibration=self._linear_trend(vibs),
            trend_rpm=self._linear_trend(rpms),
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _classify_regime(rpm: float) -> Regime:
        if rpm < 600:
            return "idle"
        if rpm < 1800:
            return "normal"
        return "peak_load"

    @staticmethod
    def _linear_trend(values: list[float]) -> float:
        """Return the per-sample slope (°C/sample, g/sample, rpm/sample)."""
        n = len(values)
        if n < 2:
            return 0.0
        return (values[-1] - values[0]) / (n - 1)
