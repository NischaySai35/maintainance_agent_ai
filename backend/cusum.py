"""
cusum.py — Cumulative Sum (CUSUM) Drift Detection
=================================================
Initializes S=0.
Update: S = max(0, S + (z_score - k))
where k = 0.5 (half standard deviation).
Threshold learned from 99th percentile of historical CUSUM.
"""
import logging
from typing import Dict, List
import numpy as np

log = logging.getLogger("aura.cusum")

SENSORS = ["temperature_C", "vibration_mm_s", "rpm", "current_A"]

class CusumDetector:
    def __init__(self):
        # S values: self.S[machine_id][sensor] = float
        self.S: Dict[str, Dict[str, float]] = {}
        # Thresholds: self.thresholds[machine_id][sensor] = float
        self.thresholds: Dict[str, Dict[str, float]] = {}
        self.k: float = 0.5  # shift magnitude parameter

    def calculate_historical_thresholds(
        self, 
        machine_id: str, 
        history_z_scores: Dict[str, List[float]]
    ) -> None:
        """
        Run CUSUM over history for each sensor to find 99th percentile.
        """
        if machine_id not in self.thresholds:
            self.thresholds[machine_id] = {}
        if machine_id not in self.S:
            self.S[machine_id] = {sensor: 0.0 for sensor in SENSORS}
            
        for sensor in SENSORS:
            z_list = history_z_scores.get(sensor, [])
            if not z_list:
                self.thresholds[machine_id][sensor] = 5.0 # fallback
                continue
                
            S_vals = []
            current_s = 0.0
            for z in z_list:
                current_s = max(0.0, current_s + (abs(z) - self.k))
                S_vals.append(current_s)
            
            p99 = np.percentile(S_vals, 99) if len(S_vals) > 0 else 5.0
            self.thresholds[machine_id][sensor] = max(p99, 1.0) # Ensure minimal threshold
            
        log.info(f"[CUSUM] {machine_id} Thresholds established: {self.thresholds[machine_id]}")

    def update(self, machine_id: str, z_scores: Dict[str, float]) -> Dict[str, float]:
        """
        Update CUSUM state with incoming absolute Z-scores. Returns current CUSUM values.
        """
        if machine_id not in self.S:
            self.S[machine_id] = {s: 0.0 for s in SENSORS}
            
        current_cusum = {}
        for sensor in SENSORS:
            z = abs(z_scores.get(sensor, 0.0))
            self.S[machine_id][sensor] = max(0.0, self.S[machine_id][sensor] + (z - self.k))
            current_cusum[sensor] = self.S[machine_id][sensor]
            
        return current_cusum

    def detect_drift(self, machine_id: str, cusum_vals: Dict[str, float]) -> List[str]:
        """Return list of sensors structurally drifting over their thresholds."""
        drifting = []
        for sensor, val in cusum_vals.items():
            th = self.thresholds.get(machine_id, {}).get(sensor, 5.0)
            if val > th:
                drifting.append(sensor)
        return drifting
