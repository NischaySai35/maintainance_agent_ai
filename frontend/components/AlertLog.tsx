/**
 * AlertLog — scrollable chronological log of alerts (real failures +
 * filtered warnings).  Category badges distinguish criticality.
 */
interface Alert {
  timestamp: string;
  machine_id: string;
  message: string;
  risk_score: number;
  category: string;
}

interface Props {
  alerts: Record<string, unknown>[];
}

function categoryBadge(category: string) {
  const base = "px-1.5 py-0.5 rounded text-xs font-semibold";
  if (category === "real_failure") return `${base} bg-red-900 text-red-300`;
  if (category === "warning") return `${base} bg-orange-900 text-orange-300`;
  return `${base} bg-slate-800 text-slate-300`;
}

export default function AlertLog({ alerts }: Props) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/80 flex flex-col">
      <div className="p-3 border-b border-slate-700">
        <h3 className="font-semibold text-sm">
          Alert Log
          <span className="ml-2 text-slate-500 text-xs font-normal">
            (real failures · warnings · filtered noise is suppressed)
          </span>
        </h3>
      </div>
      <div className="overflow-y-auto flex-1 p-3 space-y-1.5" style={{ maxHeight: "260px" }}>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-500">No alerts yet.</p>
        ) : (
          alerts.map((a, i) => {
            const alert = a as unknown as Alert;
            return (
              <div
                key={i}
                className="text-xs border-b border-slate-800/60 pb-1.5 last:border-0"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-slate-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-bold">{alert.machine_id}</span>
                  <span className={categoryBadge(alert.category)}>
                    {alert.category}
                  </span>
                  <span className="text-slate-400 ml-auto">
                    risk {Number(alert.risk_score).toFixed(1)}
                  </span>
                </div>
                <div className="text-slate-300">{alert.message}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
