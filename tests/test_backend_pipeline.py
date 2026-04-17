"""Focused unit tests for the AURA SOVEREIGN backend pipeline.

Tests cover:
  * Physical-Inertia Validator rejects impossible readings
  * Anomaly detector flags compound anomalies
  * Risk scorer rewards duration and multi-sensor involvement
  * Baseline memory correctly computes regime classification
  * Dead-reckoning (simulator dropout) produces predicted=True readings
"""
from __future__ import annotations

import unittest
from datetime import UTC, datetime, timedelta

from backend.anomaly.detector import AnomalyDetector
from backend.ingestion.simulator import MachineSimulator
from backend.memory.baseline import BaselineMemory
from backend.models.schemas import AnomalyFinding, SensorReading
from backend.physics.validation import PhysicalInertiaValidator
from backend.risk.scoring import RiskScorer


def _reading(
    machine_id: str = "M-TEST",
    temperature: float = 65.0,
    vibration: float = 1.0,
    rpm: float = 1500.0,
    dt_seconds: float = 0.0,
) -> SensorReading:
    """Helper: build a SensorReading with optional timestamp offset."""
    return SensorReading(
        machine_id=machine_id,
        timestamp=datetime.now(UTC) + timedelta(seconds=dt_seconds),
        temperature=temperature,
        vibration=vibration,
        rpm=rpm,
    )


class TestPhysicsValidation(unittest.TestCase):
    def setUp(self) -> None:
        self.validator = PhysicalInertiaValidator()

    def test_accepts_normal_reading(self) -> None:
        prev = _reading(temperature=65, rpm=1500)
        curr = _reading(temperature=65.3, rpm=1510, dt_seconds=1)
        result = self.validator.validate(curr, prev)
        self.assertTrue(result.accepted)

    def test_rejects_impossible_temperature_spike(self) -> None:
        prev = _reading(temperature=60)
        curr = _reading(temperature=120, dt_seconds=1)
        result = self.validator.validate(curr, prev)
        self.assertFalse(result.accepted)
        self.assertIn("PIV rejected", result.reason)

    def test_rejects_instant_rpm_collapse(self) -> None:
        prev = _reading(rpm=1800)
        curr = _reading(rpm=0, dt_seconds=1)
        result = self.validator.validate(curr, prev)
        self.assertFalse(result.accepted)

    def test_accepts_first_reading_without_previous(self) -> None:
        curr = _reading(temperature=999)  # absurd but no prior data → accepted
        result = self.validator.validate(curr, None)
        self.assertTrue(result.accepted)

    def test_rejected_reading_returns_previous(self) -> None:
        prev = _reading(temperature=65)
        curr = _reading(temperature=130, dt_seconds=1)
        result = self.validator.validate(curr, prev)
        self.assertFalse(result.accepted)
        # The returned reading should be the previous one (carry-forward)
        self.assertEqual(result.reading.temperature, prev.temperature)


class TestAnomalyDetection(unittest.TestCase):
    def _make_baseline_memory(self, n: int = 100) -> BaselineMemory:
        """Build a baseline with realistic Gaussian variation so std is non-trivial."""
        import random as _random
        rng = _random.Random(42)
        memory = BaselineMemory()
        base_t = datetime.now(UTC) - timedelta(seconds=n)
        for i in range(n):
            memory.add(
                SensorReading(
                    machine_id="M-TEST",
                    timestamp=base_t + timedelta(seconds=i),
                    temperature=65.0 + rng.gauss(0, 0.5),
                    vibration=1.0 + rng.gauss(0, 0.05),
                    rpm=1500.0 + rng.gauss(0, 25.0),
                )
            )
        return memory

    def test_detects_compound_anomaly(self) -> None:
        memory = self._make_baseline_memory()
        detector = AnomalyDetector()
        reading = _reading(temperature=90, vibration=2.8, rpm=2400)
        baseline = memory.compute(reading)
        finding = detector.detect(reading, baseline)
        self.assertIn("compound", finding.anomaly_types)

    def test_detects_spike(self) -> None:
        memory = self._make_baseline_memory()
        detector = AnomalyDetector()
        reading = _reading(temperature=95)
        baseline = memory.compute(reading)
        finding = detector.detect(reading, baseline)
        self.assertIn("spike", finding.anomaly_types)

    def test_no_anomaly_for_normal_reading(self) -> None:
        memory = self._make_baseline_memory()
        detector = AnomalyDetector()
        reading = _reading(temperature=65.1, vibration=1.01, rpm=1501)
        baseline = memory.compute(reading)
        finding = detector.detect(reading, baseline)
        self.assertEqual(finding.anomaly_types, [])


class TestRiskScoring(unittest.TestCase):
    def _finding(self, types: list[str], score_hint: float = 40.0) -> AnomalyFinding:
        return AnomalyFinding(
            machine_id="M-TEST",
            anomaly_types=types,
            zscores={"temperature": 1.0, "vibration": 1.0, "rpm": 1.0},
            moving_deviation={"temperature": 1.0, "vibration": 0.1, "rpm": 50.0},
            score_hint=score_hint,
        )

    def test_compound_anomaly_receives_bonus(self) -> None:
        scorer = RiskScorer()
        plain_finding = self._finding(["spike"], score_hint=40)
        compound_finding = self._finding(["spike", "compound"], score_hint=40)
        plain_risk = scorer.score(plain_finding)
        scorer2 = RiskScorer()
        compound_risk = scorer2.score(compound_finding)
        self.assertGreater(compound_risk.risk_score, plain_risk.risk_score)

    def test_duration_increases_risk(self) -> None:
        scorer = RiskScorer()
        finding = self._finding(["spike"], score_hint=20)
        first = scorer.score(finding)
        second = scorer.score(finding)
        self.assertGreater(second.risk_score, first.risk_score)

    def test_clear_anomaly_resets_duration(self) -> None:
        scorer = RiskScorer()
        finding = self._finding(["spike"])
        scorer.score(finding)
        scorer.score(finding)
        clear = self._finding([])
        result = scorer.score(clear)
        self.assertEqual(result.duration_seconds, 0)


class TestBaselineRegime(unittest.TestCase):
    def test_idle_regime(self) -> None:
        memory = BaselineMemory()
        reading = _reading(rpm=400)
        memory.add(reading)
        baseline = memory.compute(reading)
        self.assertEqual(baseline.regime, "idle")

    def test_normal_regime(self) -> None:
        memory = BaselineMemory()
        reading = _reading(rpm=1200)
        memory.add(reading)
        baseline = memory.compute(reading)
        self.assertEqual(baseline.regime, "normal")

    def test_peak_load_regime(self) -> None:
        memory = BaselineMemory()
        reading = _reading(rpm=2000)
        memory.add(reading)
        baseline = memory.compute(reading)
        self.assertEqual(baseline.regime, "peak_load")


class TestSimulatorDeadReckoning(unittest.TestCase):
    def test_dropout_produces_predicted_reading(self) -> None:
        """Force dropout probability to 100 % and verify predicted=True."""
        sim = MachineSimulator("M-TEST", seed=99)
        sim.historical_bootstrap(minutes=5)  # small bootstrap for speed
        # Override dropout probability temporarily
        original_prob = MachineSimulator.DROPOUT_PROB
        MachineSimulator.DROPOUT_PROB = 1.0
        try:
            reading = sim.next_live(tick=1)
            self.assertTrue(reading.predicted)
        finally:
            MachineSimulator.DROPOUT_PROB = original_prob

    def test_normal_reading_not_predicted(self) -> None:
        sim = MachineSimulator("M-TEST", seed=7)
        sim.historical_bootstrap(minutes=5)
        MachineSimulator.DROPOUT_PROB = 0.0
        try:
            reading = sim.next_live(tick=1)
            self.assertFalse(reading.predicted)
        finally:
            MachineSimulator.DROPOUT_PROB = 0.04


if __name__ == "__main__":
    unittest.main()
