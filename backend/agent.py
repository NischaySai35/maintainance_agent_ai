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
        if not self.llm_enabled or not piv_result.accepted or risk_score < 40:
            orchestrator, final, expl = self._orchestrator_fallback(
                machine_id, risk_score, piv_result, anomaly, duration
            )
        else:
            try:
                # Query Gemini to generate reasoning for ALL agents
                sentinel, physicist, historian, orchestrator, final, expl = self._query_gemini_agents(
                    machine_id, risk_score, anomaly, duration, baseline
                )
            except Exception as e:
                log.warning(f"Failed to query Gemini: {e}")
                orchestrator, final, expl = self._orchestrator_fallback(
                    machine_id, risk_score, piv_result, anomaly, duration
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

    def _query_gemini_agents(self, machine_id, risk, anomaly, duration, baseline) -> tuple[str, str, str, str, str, str]:
        import json
        prompt = f"""
        You are a multi-agent AI framework managing the predictive maintenance of {machine_id}.
        Current State: Risk={risk:.1f}/100, Anomalies={anomaly.anomaly_types}, Streak Duration={duration} ticks.
        Sensors Affected: {anomaly.affected_sensors}. Z-Scores: {anomaly.z_scores}.
        Historical Regime: {baseline.regime} (Temps: {baseline.temperature.rolling_mean:.1f}C, Vib: {baseline.vibration.rolling_mean:.2f}g).
        
        Output a strict JSON object with exactly these keys, each containing a 1-sentence analytical observation:
        - "sentinel": A statistical observation on the Z-scores and anomaly types.
        - "physicist": A physical diagnosis of what hardware issue matches these sensor deviations. 
        - "historian": Compare the current state to the historical regime baselines.
        - "orchestrator": A final decisive conclusion synthesizing the above.
        - "final": Exactly "Alert" or "Critical".
        - "explanation": A concise summary string suitable for a human operator dashboard alert.
        
        Return ONLY valid JSON.
        """
        
        # Configure model to enforce JSON schema if possible, or just parse text
        resp = self.model.generate_content(prompt)
        text = resp.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
            
        data = json.loads(text)
        return (
            data.get("sentinel", "Sentinel analyzing statistical anomalies."),
            data.get("physicist", "Physicist analyzing dynamics."),
            data.get("historian", "Historian analyzing baselines."),
            data.get("orchestrator", "Orchestrator synthesizing logic."),
            data.get("final", "Alert"),
            data.get("explanation", "AI Analysis completed.")
        )
