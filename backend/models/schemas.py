"""Pydantic schemas shared across the entire backend pipeline."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

# Operational regime of a machine based on RPM range
Regime = Literal["idle", "normal", "peak_load"]


class SensorReading(BaseModel):
    """One timestamped sensor sample from a machine."""

    machine_id: str
    timestamp: datetime
    temperature: float  # Celsius
    vibration: float   # arbitrary units (accelerometer g)
    rpm: float         # revolutions per minute
    predicted: bool = False  # True when produced by dead-reckoning


class ValidationResult(BaseModel):
    """Output of the Physical-Inertia Validator."""

    accepted: bool
    reason: str
    reading: SensorReading  # the accepted (or replacement) reading


class BaselineStats(BaseModel):
    """Dynamic baseline computed from historical data for one machine."""

    machine_id: str
    regime: Regime
    mean_temperature: float
    mean_vibration: float
    mean_rpm: float
    std_temperature: float
    std_vibration: float
    std_rpm: float
    rolling_temperature: float   # short-window rolling mean
    rolling_vibration: float
    rolling_rpm: float
    trend_temperature: float     # per-sample slope
    trend_vibration: float
    trend_rpm: float


class AnomalyFinding(BaseModel):
    """Anomalies found by the detector for one reading."""

    machine_id: str
    anomaly_types: list[str] = Field(default_factory=list)  # spike / drift / compound
    zscores: dict[str, float] = Field(default_factory=dict)
    moving_deviation: dict[str, float] = Field(default_factory=dict)
    score_hint: float = 0.0  # raw score hint fed into the risk layer


class AgentDecision(BaseModel):
    """Final multi-agent consensus for one reading."""

    machine_id: str
    sentinel: str      # Sentinel agent finding
    physicist: str     # Physicist agent finding
    historian: str     # Historian agent finding
    orchestrator: str  # Orchestrator consensus
    final_decision: str
    reasoning_log: list[str]  # full agent chat log


class RiskResult(BaseModel):
    """Risk score and duration for one machine."""

    machine_id: str
    risk_score: float       # 0–100
    duration_seconds: int   # consecutive ticks with anomaly
    priority_rank: int = 0  # 1 = highest priority across fleet


class AlertRequest(BaseModel):
    """Payload for POST /alert."""

    machine_id: str
    message: str
    risk_score: float
    category: str = "anomaly"


class ScheduleRequest(BaseModel):
    """Payload for POST /schedule-maintenance."""

    machine_id: str
    risk_score: float
    reason: str


@dataclass
class PipelineOutput:
    """Aggregated output of one complete pipeline tick for one machine."""

    reading: SensorReading
    validation: ValidationResult
    baseline: BaselineStats
    finding: AnomalyFinding
    decision: AgentDecision
    risk: RiskResult
    alert: Optional[dict]
    schedule: Optional[dict]
