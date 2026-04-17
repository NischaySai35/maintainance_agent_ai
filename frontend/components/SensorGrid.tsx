/**
 * SensorGrid — Zone 1 live sensor card grid.
 * Renders one card per machine with real-time sensor values and risk score.
 * Cards pulse red when an anomaly is active and show "Dead-reckoning" when
 * the reading is a prediction.
 */
import { MachineCache } from "../hooks/useSSE";

interface Props {
  machines: Record<string, MachineCache>;
}

function riskColor(score: number): string {
  if (score >= 80) return "text-red-400";
  if (score >= 50) return "text-orange-400";
  if (score >= 25) return "text-yellow-400";
  return "text-green-400";
}

export default function SensorGrid({ machines }: Props) {
  const entries = Object.entries(machines);

  if (entries.length === 0) {
    return (
      <p className="text-slate-500 text-sm">Connecting to sensor stream…</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {entries.map(([id, state]) => {
        const hasAnomaly = state.anomaly_types.length > 0;
        return (
          <div
            key={id}
            className={`rounded-lg border p-4 bg-slate-900/80 space-y-1 ${
              hasAnomaly
                ? "border-red-500/70 card-anomaly"
                : "border-slate-700"
            }`}
          >
            {/* Header */}
            <div className="flex justify-between items-center">
              <span className="font-bold text-base">{id}</span>
              <span className={`text-sm font-semibold ${riskColor(state.risk_score)}`}>
                Risk {state.risk_score.toFixed(1)}
              </span>
            </div>

            {/* Regime badge */}
            <div className="text-xs text-slate-400 uppercase tracking-wide">
              {state.regime} {state.predicted && "· ⚠ dead-reckoning"}
            </div>

            {/* Sensor values */}
            <div className="grid grid-cols-3 gap-1 text-sm">
              <div>
                <div className="text-slate-400 text-xs">Temp (°C)</div>
                <div>{state.reading.temperature.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">Vibration (g)</div>
                <div>{state.reading.vibration.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">RPM</div>
                <div>{state.reading.rpm.toFixed(0)}</div>
              </div>
            </div>

            {/* Decision summary */}
            <div className="text-xs text-slate-300 pt-1 border-t border-slate-800">
              {state.decision}
            </div>

            {/* Anomaly tags */}
            {hasAnomaly && (
              <div className="flex flex-wrap gap-1 pt-1">
                {state.anomaly_types.map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-red-900/60 text-red-300 px-2 py-0.5 rounded"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
