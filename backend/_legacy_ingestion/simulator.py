"""Machine sensor simulator with dead-reckoning fault tolerance.

Each MachineSimulator:
  * Produces realistic sensor readings (Gaussian noise around a base value).
  * Injects anomalies on deterministic cycles so the pipeline can detect them.
  * Simulates 4 % random dropout; during a dropout the last known state is
    extrapolated (dead-reckoning / shadow-state recovery).
  * Provides a historical bootstrap to pre-fill the baseline memory.
"""
from __future__ import annotations

import random
from datetime import UTC, datetime, timedelta

from backend.models.schemas import SensorReading


class MachineSimulator:
    """Simulate one industrial machine's sensor stream."""

    # Dropout probability per tick (simulates intermittent connectivity)
    DROPOUT_PROB = 0.04

    def __init__(self, machine_id: str, seed: int) -> None:
        self.machine_id = machine_id
        self._rng = random.Random(seed)

        # Stable operating point for this machine
        self._base_temp = self._rng.uniform(58.0, 74.0)
        self._base_vib = self._rng.uniform(0.8, 1.8)
        self._base_rpm = self._rng.uniform(800.0, 1950.0)

        self.last_reading: SensorReading | None = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def historical_bootstrap(self, minutes: int = 10_080) -> list[SensorReading]:
        """Generate synthetic 7-day history (one sample per simulated minute).

        Returns the list of readings so the caller can feed them to
        BaselineMemory.  After this call, ``last_reading`` is set.
        """
        start = datetime.now(UTC) - timedelta(minutes=minutes)
        history = [
            self._generate(start + timedelta(minutes=i), tick=i, predicted=False)
            for i in range(minutes)
        ]
        self.last_reading = history[-1]
        return history

    def next_live(self, tick: int) -> SensorReading:
        """Produce the next live sensor reading.

        On a dropout tick the last known values are perturbed slightly
        (dead-reckoning) and ``predicted=True`` is set so the UI can
        highlight the uncertainty.
        """
        if self._rng.random() < self.DROPOUT_PROB and self.last_reading is not None:
            return self._dead_reckon()

        reading = self._generate(datetime.now(UTC), tick=tick, predicted=False)
        self.last_reading = reading
        return reading

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _generate(
        self, timestamp: datetime, tick: int, *, predicted: bool
    ) -> SensorReading:
        """Create a realistic reading with noise and scheduled anomaly injection."""
        temp = self._base_temp + self._rng.gauss(0, 0.5)
        vib = max(0.05, self._base_vib + self._rng.gauss(0, 0.06))
        rpm = max(250.0, self._base_rpm + self._rng.gauss(0, 28.0))

        if not predicted:
            temp, vib, rpm = self._inject_anomaly(temp, vib, rpm, tick)

        reading = SensorReading(
            machine_id=self.machine_id,
            timestamp=timestamp,
            temperature=round(temp, 4),
            vibration=round(vib, 4),
            rpm=round(rpm, 2),
            predicted=predicted,
        )
        self.last_reading = reading
        return reading

    def _inject_anomaly(
        self, temp: float, vib: float, rpm: float, tick: int
    ) -> tuple[float, float, float]:
        """Inject realistic anomalies on deterministic cycles.

        Cycle 45  → temperature spike
        Cycle 70  → vibration spike
        Cycle 35–55 of 120 → sustained thermal/vibration drift
        Cycle 90  → RPM dip
        """
        if tick % 45 == 0:
            temp += self._rng.uniform(6.0, 14.0)
        if tick % 70 == 0:
            vib += self._rng.uniform(0.9, 2.0)
        phase = tick % 120
        if 35 <= phase <= 55:
            offset = phase - 35  # 0 … 20
            temp += 0.14 * offset
            vib += 0.025 * offset
        if tick % 90 == 0:
            rpm -= self._rng.uniform(280.0, 500.0)
        return temp, vib, max(0.0, rpm)

    def _dead_reckon(self) -> SensorReading:
        """Extrapolate the last known reading with micro-perturbations."""
        last = self.last_reading  # guaranteed non-None by caller
        assert last is not None  # for type checker
        return SensorReading(
            machine_id=self.machine_id,
            timestamp=datetime.now(UTC),
            temperature=round(max(0.0, last.temperature + self._rng.gauss(0, 0.05)), 4),
            vibration=round(max(0.01, last.vibration + self._rng.gauss(0, 0.01)), 4),
            rpm=round(max(0.0, last.rpm + self._rng.gauss(0, 6.0)), 2),
            predicted=True,
        )
