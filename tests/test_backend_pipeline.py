"""Focused unit tests for the current backend pipeline modules.

Coverage:
  * PIV rejects implausible transitions and carries last valid reading.
  * Anomaly detector flags spike/compound and ignores nominal readings.
  * Risk scorer increases with duration and resets on clear ticks.
  * Baseline manager + ML fallback regime selection work with live-like dicts.
  * Shadow-state manager emits predicted readings and reconnect checks.
"""
from __future__ import annotations

import os
import sys
import unittest
from datetime import UTC, datetime, timedelta

# backend modules use local imports (e.g., "from baseline import ...").
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from baseline import BaselineManager
from detector import AnomalyDetector
from model import MLIntelligence
from piv import PIVValidator
from scorer import RiskScorer
from shadow import ShadowStateManager


def _ts(offset_seconds: int = 0) -> str:
    return (datetime.now(UTC) + timedelta(seconds=offset_seconds)).isoformat()


def _reading(
    machine_id: str = "M-TEST",
    temperature_C: float = 65.0,
    vibration_mm_s: float = 1.0,
    rpm: float = 1500.0,
    current_A: float = 10.0,
    status: str = "running",
    dt_seconds: int = 0,
) -> dict:
    return {
        "machine_id": machine_id,
        "timestamp": _ts(dt_seconds),
        "temperature_C": temperature_C,
        "vibration_mm_s": vibration_mm_s,
        "rpm": rpm,
        "current_A": current_A,
        "status": status,
    }


class TestPhysicsValidation(unittest.TestCase):
    def setUp(self) -> None:
        self.validator = PIVValidator()

    def test_accepts_normal_reading(self) -> None:
        prev = _reading(temperature_C=65, rpm=1500)
        curr = _reading(temperature_C=65.5, rpm=1510, dt_seconds=1)
        result = self.validator.validate(curr, prev, "active")
        self.assertTrue(result.accepted)

    def test_rejects_impossible_temperature_spike(self) -> None:
        prev = _reading(temperature_C=60)
        curr = _reading(temperature_C=120, dt_seconds=1)
        result = self.validator.validate(curr, prev, "active")
        self.assertFalse(result.accepted)
        self.assertIn("PIV rejected", result.reason)

    def test_rejects_instant_rpm_collapse(self) -> None:
        prev = _reading(rpm=1800)
        curr = _reading(rpm=0, dt_seconds=1)
        result = self.validator.validate(curr, prev, "active")
        self.assertFalse(result.accepted)

    def test_accepts_first_reading_without_previous(self) -> None:
        curr = _reading(temperature_C=999)
        result = self.validator.validate(curr, None, "active")
        self.assertTrue(result.accepted)

    def test_rejected_reading_returns_previous(self) -> None:
        prev = _reading(temperature_C=65)
        curr = _reading(temperature_C=130, dt_seconds=1)
        result = self.validator.validate(curr, prev, "active")
        self.assertFalse(result.accepted)
        self.assertEqual(result.reading["temperature_C"], prev["temperature_C"])


class TestAnomalyDetection(unittest.TestCase):
    def _make_baseline(self):
        manager = BaselineManager()
        history = []
        base_t = datetime.now(UTC) - timedelta(seconds=120)
        for i in range(120):
            history.append({
                "machine_id": "M-TEST",
                "timestamp": (base_t + timedelta(seconds=i)).isoformat(),
                "temperature_C": 65.0 + ((i % 5) * 0.1),
                "vibration_mm_s": 1.0 + ((i % 3) * 0.02),
                "rpm": 1500.0 + ((i % 7) * 4),
                "current_A": 10.0 + ((i % 4) * 0.1),
            })

        predictor = lambda _mid, rpm: "idle" if rpm < 1000 else ("active" if rpm < 3000 else "peak")
        manager.load_history("M-TEST", history, predictor)
        return manager.get_baseline("M-TEST", "active")

    def test_detects_compound_anomaly(self) -> None:
        detector = AnomalyDetector()
        baseline = self._make_baseline()
        reading = _reading(temperature_C=95, vibration_mm_s=4.5, rpm=2400, current_A=20)
        finding = detector.detect(reading, baseline, drifting_sensors=["temperature_C"], prev_reading=_reading())
        self.assertIn("compound", finding.anomaly_types)

    def test_detects_spike(self) -> None:
        detector = AnomalyDetector()
        baseline = self._make_baseline()
        reading = _reading(temperature_C=110)
        finding = detector.detect(reading, baseline, drifting_sensors=[], prev_reading=_reading())
        self.assertIn("spike", finding.anomaly_types)

    def test_no_anomaly_for_normal_reading(self) -> None:
        detector = AnomalyDetector()
        baseline = self._make_baseline()
        reading = _reading(temperature_C=65.1, vibration_mm_s=1.01, rpm=1501)
        finding = detector.detect(reading, baseline, drifting_sensors=[], prev_reading=_reading())
        self.assertEqual(finding.anomaly_types, [])


class TestRiskScoring(unittest.TestCase):
    def _finding(self, types: list[str]):
        baseline = BaselineManager()
        predictor = lambda _mid, rpm: "active" if rpm >= 1000 else "idle"
        history = [_reading(dt_seconds=i) for i in range(-30, 0)]
        baseline.load_history("M-TEST", history, predictor)
        bl = baseline.get_baseline("M-TEST", "active")
        detector = AnomalyDetector()
        reading = _reading(temperature_C=92, vibration_mm_s=3.8, rpm=2400, current_A=22)
        found = detector.detect(reading, bl, drifting_sensors=["temperature_C"], prev_reading=_reading())
        found.anomaly_types = types
        return found

    def test_duration_increases_risk(self) -> None:
        scorer = RiskScorer()
        finding = self._finding(["spike"])
        reading = _reading(current_A=18)
        first = scorer.score(finding, reading)
        second = scorer.score(finding, reading)
        self.assertGreater(second.risk_score, first.risk_score)

    def test_clear_anomaly_resets_duration(self) -> None:
        scorer = RiskScorer()
        anomaly = self._finding(["spike"])
        scorer.score(anomaly, _reading())
        scorer.score(anomaly, _reading())
        cleared = self._finding([])
        result = scorer.score(cleared, _reading())
        self.assertEqual(result.duration_ticks, 0)


class TestBaselineRegime(unittest.TestCase):
    def test_idle_regime(self) -> None:
        model = MLIntelligence()
        self.assertEqual(model.predict_regime("M-TEST", 400), "idle")

    def test_active_regime(self) -> None:
        model = MLIntelligence()
        self.assertEqual(model.predict_regime("M-TEST", 1200), "active")

    def test_peak_regime(self) -> None:
        model = MLIntelligence()
        self.assertEqual(model.predict_regime("M-TEST", 3500), "peak")


class TestShadowDeadReckoning(unittest.TestCase):
    def test_predict_sets_predicted_flag(self) -> None:
        shadow = ShadowStateManager()
        shadow.record_actual(_reading(machine_id="M-TEST", rpm=1500))
        predicted = shadow.predict("M-TEST")
        self.assertIsNotNone(predicted)
        self.assertTrue(predicted["predicted"])

    def test_reconnect_deviation_path(self) -> None:
        shadow = ShadowStateManager()
        shadow.record_actual(_reading(machine_id="M-TEST", temperature_C=60, rpm=1400))
        shadow.record_actual(_reading(machine_id="M-TEST", temperature_C=61, rpm=1410, dt_seconds=1))
        anomaly, deviation, explanation = shadow.check_reconnect_deviation(
            "M-TEST",
            _reading(machine_id="M-TEST", temperature_C=90, rpm=2100, dt_seconds=3),
        )
        self.assertTrue(isinstance(anomaly, bool))
        self.assertGreaterEqual(deviation, 0.0)
        self.assertTrue(len(explanation) > 0)


if __name__ == "__main__":
    unittest.main()
