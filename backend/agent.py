"""
agent.py — Agent War Room (Gemini AI)
=====================================
Multi-agent reasoning relying on Google Gemini. Returns structured insights.
"""
from __future__ import annotations

import os
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional
import google.generativeai as genai

try:
    from .baseline import RegimeBaseline
    from .detector import AnomalyResult
    from .piv import PIVResult
    from .model import MLIntelligence
except ImportError:
    from baseline import RegimeBaseline
    from detector import AnomalyResult
    from piv import PIVResult
    from model import MLIntelligence

log = logging.getLogger("aura.agent")

@dataclass
class AgentDecision:
    machine_id:    str
    sentinel:      str
    physicist:     str
    historian:     str
    orchestrator:  str
    final_decision: str
    explanation:   str
    reasoning_log: List[str] = field(default_factory=list)

class LLMExplainer:
    def __init__(self):
        from dotenv import load_dotenv
        load_dotenv()  # Load .env file automatically
        
        # Using placeholder model config if no API key is present
        api_key = os.getenv("GEMINI_API_KEY", "")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel("gemini-2.0-flash")
            self.llm_enabled = True
        else:
            self.model = None
            self.llm_enabled = False
            log.warning("GEMINI_API_KEY not found. Agent War Room will use fallback heuristics.")

    def reason(
        self,
        *,
        machine_id:   str,
        piv_result:   PIVResult,
        baseline:     RegimeBaseline,
        anomaly:      AnomalyResult,
        risk_score:   float,
        duration:     int
    ) -> AgentDecision:
        
        # Determine base components
        sentinel = self._sentinel_agent(anomaly)
        physicist = self._physicist_agent(piv_result)
        historian = self._historian_agent(baseline)
        
        # Decide narrative
        if not self.llm_enabled:
            orchestrator, final, expl = self._orchestrator_fallback(
                machine_id, risk_score, piv_result, anomaly, duration
            )
        else:
            orchestrator, final, expl = self._orchestrator_gemini(
                machine_id, risk_score, piv_result, anomaly, duration, baseline, sentinel, physicist, historian
            )

        log.debug(f"[Agent] {machine_id} - Expl: {expl}")

        return AgentDecision(
            machine_id=machine_id,
            sentinel=sentinel,
            physicist=physicist,
            historian=historian,
            orchestrator=orchestrator,
            final_decision=final,
            explanation=expl,
            reasoning_log=[
                f"[Sentinel] {sentinel}",
                f"[Physicist] {physicist}",
                f"[Historian] {historian}",
                f"[Orchestrator] {orchestrator}"
            ]
        )

    def _sentinel_agent(self, anomaly: AnomalyResult) -> str:
        if not anomaly.anomaly_types:
            z_strs = [f"{k}={v:.1f}" for k,v in anomaly.z_scores.items()]
            return f"All sensors nominal. Max Z-scores: {', '.join(z_strs)}"
        return f"Anomalies [{','.join(anomaly.anomaly_types)}] on {','.join(anomaly.affected_sensors)}."

    def _physicist_agent(self, piv: PIVResult) -> str:
        if piv.accepted:
            return "Dynamics follow known physical models."
        return f"Impossible physical state rejected: {piv.reason}."

    def _historian_agent(self, baseline: RegimeBaseline) -> str:
        return f"Regime '{baseline.regime}'. Rolling mean temps: {baseline.temperature.rolling_mean:.1f}C, vibrations: {baseline.vibration.rolling_mean:.2f}g."

    def _orchestrator_fallback(self, machine_id: str, risk: float, piv: PIVResult, anomaly: AnomalyResult, duration: int) -> tuple[str, str, str]:
        if not piv.accepted:
            return "Noise filtered.", "Filtered", f"{machine_id} rejected due to physical impossibilities."
        if risk < 40:
            return "Nominal operation.", "Healthy", f"{machine_id} operating well within acceptable limits. Risk {risk:.1f}/100."
        if risk < 70:
            return f"Monitor flag triggered. Streak={duration}.", "Alert", f"{machine_id} showing unusual patterns ({','.join(anomaly.anomaly_types)}). Issue alert."
        return "Critical breakdown imminent.", "Critical", f"{machine_id} has sustained severe anomalies ({','.join(anomaly.anomaly_types)}). Immediate maintenance required."

    def _orchestrator_gemini(self, machine_id, risk, piv, anomaly, duration, baseline, sent, physi, hist) -> tuple[str, str, str]:
        if not piv.accepted or risk < 40:
            return self._orchestrator_fallback(machine_id, risk, piv, anomaly, duration)
            
        prompt = f"""
        Act as the Orchestrator Agent for an industrial predictive maintenance system protecting {machine_id}.
        Current State: Risk={risk:.1f}/100, Anomaly Types={anomaly.anomaly_types}, Duration={duration} ticks.
        Agent Inputs:
        - Sentinel: {sent}
        - Physicist: {physi}
        - Historian: {hist}
        
        Provide a concise 1-sentence technical explanation of what is likely physically failing (e.g., 'bearing wear', 'cavitation') and a precise recommendation.
        No fluff. Just the diagnosis and action.
        """
        try:
            resp = self.model.generate_content(prompt)
            text = resp.text.strip().replace("\n", " ")
            if risk < 70:
                final = "Alert"
            else:
                final = "Critical"
            return "LLM consensus reached.", final, text
        except Exception as e:
            log.warning(f"Failed to query Gemini: {e}")
            return self._orchestrator_fallback(machine_id, risk, piv, anomaly, duration)
