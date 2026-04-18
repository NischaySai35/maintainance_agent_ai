"""
model.py — Advanced Intelligence Layer (Regime KMeans & Risk Logistic Regression)
=============================================================================
1. Regime Detection: KMeans (k=3) trained on historical RPM per machine.
2. Risk Model: Logistic Regression trained on pseudo-labels from history.
"""
from __future__ import annotations

import logging
import math
from collections import defaultdict
from typing import Dict, List, Any
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

log = logging.getLogger("aura.model")

REGIMES = {0: "idle", 1: "active", 2: "peak"}

class MLIntelligence:
    def __init__(self):
        self.kmeans_models: Dict[str, KMeans] = {}
        self.regime_mappings: Dict[str, Dict[int, str]] = {}
        
        self.risk_model: LogisticRegression = LogisticRegression(class_weight='balanced')
        self.scaler: StandardScaler = StandardScaler()
        self.is_trained: bool = False
        self._smoothed_risk: Dict[str, float] = defaultdict(float)

    def train_regimes(self, history_by_machine: Dict[str, List[dict]]) -> None:
        """Train KMeans on RPM for each machine to define the 3 regimes."""
        for mid, records in history_by_machine.items():
            rpms = np.array([r.get("rpm", 0) for r in records]).reshape(-1, 1)
            if len(rpms) < 3:
                continue
                
            kmeans = KMeans(n_clusters=3, random_state=42, n_init='auto')
            kmeans.fit(rpms)
            self.kmeans_models[mid] = kmeans
            
            # Map clusters sorted by centers to idle(0), active(1), peak(2)
            centers = kmeans.cluster_centers_.flatten()
            sorted_idx = np.argsort(centers)
            mapping = {sorted_idx[i]: REGIMES[i] for i in range(3)}
            self.regime_mappings[mid] = mapping
            
            log.info(f"[ML Model] {mid} Regimes trained: {mapping} with centers {centers}")

    def predict_regime(self, machine_id: str, rpm: float) -> str:
        """Predict regime based on RPM."""
        if machine_id not in self.kmeans_models:
            # Fallback to statics if not trained
            if rpm < 1000: return "idle"
            if rpm < 3000: return "active"
            return "peak"
            
        cluster = self.kmeans_models[machine_id].predict([[rpm]])[0]
        return self.regime_mappings[machine_id][cluster]

    def train_risk_model(self, X: pd.DataFrame, y: pd.Series) -> None:
        """Train logistic regression model for risk score using standardized features."""
        if len(X) < 10 or len(np.unique(y)) < 2:
            log.warning("[ML Model] Insufficient data/variance to train risk model.")
            return
            
        X_scaled = self.scaler.fit_transform(X)
        self.risk_model.fit(X_scaled, y)
        self.is_trained = True
        log.info("[ML Model] Risk Logistic Regression model trained successfully.")

    def predict_risk(self, machine_id: str, features: dict, multi_sensor_anomaly: bool, high_current: bool, piv_rejected: bool) -> tuple[float, float]:
        """
        Predict risk purely using the Logistic Regression model. No manual weighting constraints.
        Returns (raw_prob, risk_score)
        """
        if not self.is_trained:
            return 0.0, 0.0

        # Order must exactly match training feature_ordered
        feature_ordered = [
            features.get("z_temp", 0),
            features.get("z_vibration", 0),
            features.get("z_rpm", 0),
            features.get("z_current", 0),
            features.get("cusum_temp", 0),
            features.get("cusum_vibration", 0),
            features.get("rate_temp", 0),
            features.get("rate_vibration", 0),
            features.get("sensor_count", 0),
            features.get("duration", 0),
            features.get("regime_id", 0)
        ]

        # Standardize features
        X_val = self.scaler.transform([feature_ordered])
        
        # P(anomaly)
        risk_prob = self.risk_model.predict_proba(X_val)[0][1]
        
        # Exact risk score projection per user constraint
        risk_score = risk_prob * 100.0

        # Severely suppress risk if Physical Interia Validation detected noise
        if piv_rejected:
            risk_score *= 0.1

        risk_score = min(100.0, max(0.0, risk_score))
        
        # Implement Temporal Risk Inertia (climb slowly, fall slowly)
        prev_risk = self._smoothed_risk.get(machine_id, 0.0)
        
        if risk_score > prev_risk:
            # Climb rate limited to prevent instant 100% on a 2-second glitch
            smoothed_risk = prev_risk + (risk_score - prev_risk) * 0.25
        else:
            # Fall faster than we climb to clear fixes quickly
            smoothed_risk = prev_risk * 0.8 + risk_score * 0.2

        # Noise Floor: Don't show trace risk if it's effectively zero
        if smoothed_risk < 10.0:
            smoothed_risk = 0.0

        self._smoothed_risk[machine_id] = smoothed_risk
        return risk_prob, round(smoothed_risk, 2)
