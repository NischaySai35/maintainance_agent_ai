/**
 * AgentWarRoom — live scrolling log of multi-agent reasoning messages.
 * Each line is color-coded by agent (Sentinel / Physicist / Historian /
 * Orchestrator).
 */
import { useEffect, useRef } from "react";

interface Props {
  logs: string[];
}

function lineColor(line: string): string {
  if (line.startsWith("[Sentinel]")) return "text-cyan-400";
  if (line.startsWith("[Physicist]")) return "text-yellow-400";
  if (line.startsWith("[Historian]")) return "text-purple-400";
  if (line.startsWith("[Orchestrator]")) return "text-green-400";
  return "text-slate-300";
}

export default function AgentWarRoom({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/80 flex flex-col">
      <div className="p-3 border-b border-slate-700">
        <h3 className="font-semibold text-sm">
          Agent War Room
          <span className="ml-2 text-slate-500 text-xs font-normal">
            <span className="text-cyan-400">Sentinel</span> ·{" "}
            <span className="text-yellow-400">Physicist</span> ·{" "}
            <span className="text-purple-400">Historian</span> ·{" "}
            <span className="text-green-400">Orchestrator</span>
          </span>
        </h3>
      </div>
      <div
        className="overflow-y-auto p-3 space-y-0.5"
        style={{ height: "240px" }}
      >
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">Waiting for agent reasoning…</p>
        ) : (
          logs.map((line, idx) => (
            <p
              key={idx}
              className={`text-xs leading-relaxed ${lineColor(line)}`}
            >
              {line}
            </p>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
