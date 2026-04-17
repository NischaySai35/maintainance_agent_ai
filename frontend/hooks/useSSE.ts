/**
 * useSSE — subscribes to the backend SSE /stream endpoint and maintains
 * per-machine state, an alert log, and the agent reasoning log.
 *
 * Reconnects automatically if the connection is lost.
 */
import { useEffect, useRef, useState } from "react";

export interface MachineState {
  reading: {
    machine_id: string;
    temperature: number;
    vibration: number;
    rpm: number;
    predicted: boolean;
  };
  risk: { risk_score: number; duration_seconds: number };
  decision: { final_decision: string; reasoning_log: string[] };
  validation: { accepted: boolean; reason: string };
  finding: { anomaly_types: string[] };
  baseline: { regime: string };
  alert?: Record<string, unknown>;
  schedule?: Record<string, unknown>;
}

export interface MachineCache {
  reading: MachineState["reading"];
  risk_score: number;
  duration_seconds: number;
  decision: string;
  reasoning_log: string[];
  validation_reason: string;
  predicted: boolean;
  regime: string;
  anomaly_types: string[];
}

const MAX_ALERTS = 60;
const MAX_REASONING = 200;
const RECONNECT_DELAY_MS = 3_000;

export function useSSE(apiBase: string) {
  const [machines, setMachines] = useState<Record<string, MachineCache>>({});
  const [alerts, setAlerts] = useState<Record<string, unknown>[]>([]);
  const [reasoning, setReasoning] = useState<string[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      const es = new EventSource(`${apiBase}/stream`);
      esRef.current = es;

      es.addEventListener("machine", (evt: Event) => {
        const raw = JSON.parse((evt as MessageEvent).data) as MachineState;

        setMachines((prev) => ({
          ...prev,
          [raw.reading.machine_id]: {
            reading: raw.reading,
            risk_score: raw.risk.risk_score,
            duration_seconds: raw.risk.duration_seconds,
            decision: raw.decision.final_decision,
            reasoning_log: raw.decision.reasoning_log,
            validation_reason: raw.validation.reason,
            predicted: raw.reading.predicted,
            regime: raw.baseline.regime,
            anomaly_types: raw.finding.anomaly_types,
          },
        }));

        if (raw.alert) {
          setAlerts((prev) => [raw.alert!, ...prev].slice(0, MAX_ALERTS));
        }

        setReasoning((prev) =>
          [...prev, ...raw.decision.reasoning_log].slice(-MAX_REASONING)
        );
      });

      es.onerror = () => {
        es.close();
        if (!destroyed) {
          setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    }

    connect();
    return () => {
      destroyed = true;
      esRef.current?.close();
    };
  }, [apiBase]);

  return { machines, alerts, reasoning };
}
