"""Physical-Inertia Validator (PIV).

Rejects sensor readings that violate the physical constraints of real industrial
machines (thermal inertia, mechanical response delay, etc.) to eliminate false
positives caused by noisy or glitching sensors.
"""
from __future__ import annotations

from backend.models.schemas import SensorReading, ValidationResult


class PhysicalInertiaValidator:
    """Validate sensor readings against rate-of-change limits derived from
    physical properties of the monitored machines.

    Constraints (per second):
      * Temperature: max 8 °C/s  (thermal inertia)
      * RPM:         max 800 rpm/s (mechanical response delay)
      * Vibration:   max 2.0 g/s
    """

    def __init__(
        self,
        max_temp_rate: float = 8.0,
        max_rpm_rate: float = 800.0,
        max_vibration_rate: float = 2.0,
    ) -> None:
        self.max_temp_rate = max_temp_rate
        self.max_rpm_rate = max_rpm_rate
        self.max_vibration_rate = max_vibration_rate

    def validate(
        self,
        current: SensorReading,
        previous: SensorReading | None,
    ) -> ValidationResult:
        """Return ValidationResult.  If the reading is rejected, the *previous*
        valid reading is carried forward so monitoring never has a blind spot."""

        if previous is None:
            # No prior sample — accept unconditionally.
            return ValidationResult(
                accepted=True, reason="initial sample", reading=current
            )

        dt = max((current.timestamp - previous.timestamp).total_seconds(), 1e-3)

        temp_rate = abs(current.temperature - previous.temperature) / dt
        rpm_rate = abs(current.rpm - previous.rpm) / dt
        vib_rate = abs(current.vibration - previous.vibration) / dt

        if temp_rate > self.max_temp_rate:
            return ValidationResult(
                accepted=False,
                reason=(
                    f"PIV rejected: thermal inertia exceeded "
                    f"({temp_rate:.2f} °C/s > {self.max_temp_rate} °C/s)"
                ),
                reading=previous,
            )

        # Detect physically impossible instant RPM collapse while running fast.
        if previous.rpm > 400 and current.rpm == 0 and dt <= 1.5:
            return ValidationResult(
                accepted=False,
                reason="PIV rejected: impossible instant RPM collapse to zero",
                reading=previous,
            )

        if rpm_rate > self.max_rpm_rate:
            return ValidationResult(
                accepted=False,
                reason=(
                    f"PIV rejected: mechanical response exceeded "
                    f"({rpm_rate:.1f} rpm/s > {self.max_rpm_rate} rpm/s)"
                ),
                reading=previous,
            )

        if vib_rate > self.max_vibration_rate:
            return ValidationResult(
                accepted=False,
                reason=(
                    f"PIV rejected: vibration jump exceeded "
                    f"({vib_rate:.2f} g/s > {self.max_vibration_rate} g/s)"
                ),
                reading=previous,
            )

        return ValidationResult(accepted=True, reason="PIV accepted", reading=current)
