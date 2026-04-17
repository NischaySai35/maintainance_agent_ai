"""Multi-agent reasoning engine.

Four agents collaborate on every validated reading:
  Sentinel  — statistical anomaly detector
  Physicist — validates physics consistency
  Historian — contextualises against historical baseline and regime
  Orchestrator — combines all outputs into a final decision + explanation
"""
from __future__ import annotations

from backend.models.schemas import (
    AgentDecision,
    AnomalyFinding,
    BaselineStats,
    RiskResult,
    ValidationResult,
)


class MultiAgentReasoner:
    """Produces an AgentDecision by routing a reading through all four agents."""

    def reason(
        self,
        machine_id: str,
        validation: ValidationResult,
        baseline: BaselineStats,
        finding: AnomalyFinding,
        risk: RiskResult,
        shared_event: str | None = None,
    ) -> AgentDecision:
        # --- Sentinel agent ---
        if finding.anomaly_types:
            sentinel = (
                f"Anomaly detected: {', '.join(finding.anomaly_types)} — "
                f"z(T={finding.zscores['temperature']:.2f}, "
                f"V={finding.zscores['vibration']:.2f}, "
                f"R={finding.zscores['rpm']:.2f})"
            )
        else:
            sentinel = (
                f"All sensors within normal bounds — "
                f"z(T={finding.zscores['temperature']:.2f}, "
                f"V={finding.zscores['vibration']:.2f}, "
                f"R={finding.zscores['rpm']:.2f})"
            )

        # --- Physicist agent ---
        if validation.accepted:
            physicist = f"Reading passes PIV. {validation.reason}."
        else:
            physicist = f"Reading FAILED PIV — {validation.reason}. Noise filtered."

        # --- Historian agent ---
        historian = (
            f"Regime: {baseline.regime}. "
            f"Trend T={baseline.trend_temperature:+.4f}/sample, "
            f"V={baseline.trend_vibration:+.5f}/sample, "
            f"R={baseline.trend_rpm:+.4f}/sample."
        )

        # --- Orchestrator decision ---
        if not validation.accepted:
            final = "Filtered sensor noise — no action required"
        elif risk.risk_score >= 80:
            final = "CRITICAL — schedule immediate maintenance"
        elif risk.risk_score >= 50:
            final = "HIGH RISK — alert operator"
        elif finding.anomaly_types:
            final = "Monitor closely — anomaly present but risk is manageable"
        else:
            final = "Healthy"

        orchestrator = (
            f"Consensus: {final}. "
            f"Risk score: {risk.risk_score:.1f}/100, "
            f"duration: {risk.duration_seconds} tick(s)."
        )
        if shared_event:
            orchestrator += f" ⚠ Cross-machine event: {shared_event}."

        reasoning_log = [
            f"[Sentinel]     {sentinel}",
            f"[Physicist]    {physicist}",
            f"[Historian]    {historian}",
            f"[Orchestrator] {orchestrator}",
        ]

        return AgentDecision(
            machine_id=machine_id,
            sentinel=sentinel,
            physicist=physicist,
            historian=historian,
            orchestrator=orchestrator,
            final_decision=final,
            reasoning_log=reasoning_log,
        )
