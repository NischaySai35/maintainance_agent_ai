"""
baseline.py — Dynamic Regime-Aware Baseline Manager
===================================================
"""
from __future__ import annotations

import logging
import math
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Callable

log = logging.getLogger("aura.baseline")

Regime = str
SENSORS = ("temperature_C", "vibration_mm_s", "rpm", "current_A")
ROLLING_WINDOW = 300
MIN_SAMPLES = 5

@dataclass
class SensorStats:
    mean:         float = 0.0
    std:          float = 1.0
    rolling_mean: float = 0.0
    count:        int   = 0

@dataclass
class RegimeBaseline:
    regime:      Regime
    machine_id:  str
    temperature: SensorStats = field(default_factory=SensorStats)
    vibration:   SensorStats = field(default_factory=SensorStats)
    rpm:         SensorStats = field(default_factory=SensorStats)
    current:     SensorStats = field(default_factory=SensorStats)

    def get(self, sensor: str) -> SensorStats:
        _map = {"temperature_C": self.temperature, "vibration_mm_s": self.vibration, "rpm": self.rpm, "current_A": self.current}
        return _map.get(sensor, SensorStats())

class _RollingAccumulator:
    def __init__(self, maxlen: int = ROLLING_WINDOW):
        self._buf: deque[float] = deque(maxlen=maxlen)

    def add(self, value: float) -> None:
        self._buf.append(value)

    def mean(self) -> float:
        return sum(self._buf) / len(self._buf) if self._buf else 0.0

    def std(self, min_std: float = 0.01) -> float:
        n = len(self._buf)
        if n < 2: return min_std
        m = self.mean()
        var = sum((x - m) ** 2 for x in self._buf) / n
        return max(math.sqrt(var), min_std)

    def count(self) -> int:
        return len(self._buf)

class BaselineManager:
    def __init__(self, rolling_window: int = ROLLING_WINDOW):
        self._rolling_window = rolling_window
        self._accumulators: Dict[str, Dict[str, Dict[str, _RollingAccumulator]]] = {}
        self._cache: Dict[str, Dict[str, RegimeBaseline]] = {}

    def _ensure(self, machine_id: str):
        if machine_id not in self._accumulators:
            self._accumulators[machine_id] = {
                r: {s: _RollingAccumulator(self._rolling_window) for s in SENSORS}
                for r in ("idle", "active", "peak")
            }

    def load_history(self, machine_id: str, readings: List[dict], predictor: Callable[[str, float], str]):
        self._ensure(machine_id)
        for r in readings:
            regime = predictor(machine_id, r.get("rpm", 0.0))
            acc = self._accumulators[machine_id][regime]
            acc["temperature_C"].add(float(r.get("temperature_C", 0.0)))
            acc["vibration_mm_s"].add(float(r.get("vibration_mm_s", 0.0)))
            acc["rpm"].add(float(r.get("rpm", 0.0)))
            acc["current_A"].add(float(r.get("current_A", 0.0)))
        self._rebuild_cache(machine_id)

    def update(self, reading: dict, regime: str):
        mid = reading.get("machine_id", "")
        self._ensure(mid)
        acc = self._accumulators[mid][regime]
        acc["temperature_C"].add(float(reading.get("temperature_C", 0.0)))
        acc["vibration_mm_s"].add(float(reading.get("vibration_mm_s", 0.0)))
        acc["rpm"].add(float(reading.get("rpm", 0.0)))
        acc["current_A"].add(float(reading.get("current_A", 0.0)))
        self._rebuild_cache(mid)

    def get_baseline(self, machine_id: str, regime: str) -> RegimeBaseline:
        self._ensure(machine_id)
        if machine_id not in self._cache: self._rebuild_cache(machine_id)
        bls = self._cache.get(machine_id, {})
        bl = bls.get(regime)
        if not bl:
            for fb in ("active", "idle", "peak"):
                bl = bls.get(fb)
                if bl: break
        return bl or RegimeBaseline(regime=regime, machine_id=machine_id)

    def get_rate_data(self, machine_id: str) -> dict:
        self._ensure(machine_id)
        res = {}
        for reg, sens in self._accumulators.get(machine_id, {}).items():
            res[reg] = {s: list(a._buf) for s, a in sens.items()}
        return res

    def all_machines_loaded(self) -> List[str]:
        return [
            mid for mid, reg in self._accumulators.items()
            if any(a.count() >= MIN_SAMPLES for s in reg.values() for a in s.values())
        ]

    def _rebuild_cache(self, machine_id: str):
        cache = {}
        for reg, sens in self._accumulators[machine_id].items():
            bl = RegimeBaseline(regime=reg, machine_id=machine_id)
            bl.temperature = _stats_from_acc(sens["temperature_C"], min_std=0.1)
            bl.vibration = _stats_from_acc(sens["vibration_mm_s"], min_std=0.01)
            bl.rpm = _stats_from_acc(sens["rpm"], min_std=1.0)
            bl.current = _stats_from_acc(sens["current_A"], min_std=0.01)
            cache[reg] = bl
        self._cache[machine_id] = cache

def _stats_from_acc(acc: _RollingAccumulator, min_std: float) -> SensorStats:
    return SensorStats(mean=acc.mean(), std=acc.std(min_std), rolling_mean=acc.mean(), count=acc.count())
