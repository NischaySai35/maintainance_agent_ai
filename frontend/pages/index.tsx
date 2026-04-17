/**
 * AURA SOVEREIGN Dashboard — main page
 *
 * Layout
 * -------
 * Zone 1 (top):   Live sensor grid  |  Alert log
 * Zone 2 (middle): Entropy spheres  |  State-space plot
 * Zone 3 (bottom): Agent War Room (full width)
 *
 * 3D components are loaded dynamically (no SSR) because Three.js requires a
 * browser DOM.
 */
import dynamic from "next/dynamic";

import AgentWarRoom from "../components/AgentWarRoom";
import AlertLog from "../components/AlertLog";
import SensorGrid from "../components/SensorGrid";
import { useSSE } from "../hooks/useSSE";

// Load 3-D components client-side only
const EntropySpheres = dynamic(() => import("../3d/EntropySpheres"), {
  ssr: false,
  loading: () => (
    <div className="h-64 rounded-lg border border-slate-700 bg-slate-900/80 flex items-center justify-center text-slate-500 text-sm">
      Loading 3D…
    </div>
  ),
});
const StateSpacePlot = dynamic(() => import("../3d/StateSpacePlot"), {
  ssr: false,
  loading: () => (
    <div className="h-64 rounded-lg border border-slate-700 bg-slate-900/80 flex items-center justify-center text-slate-500 text-sm">
      Loading 3D…
    </div>
  ),
});

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

export default function Home() {
  const { machines, alerts, reasoning } = useSSE(API_BASE);

  return (
    <main className="min-h-screen p-4 md:p-6 space-y-5">
      {/* ── Header ── */}
      <header>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">
          AURA SOVEREIGN
        </h1>
        <p className="text-slate-400 text-sm">
          Physics-Validated Autonomous Maintenance System · continuous
          closed-loop pipeline
        </p>
      </header>

      {/* ── Zone 1: Live sensor grid + Alert log ── */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Zone 1 · Live sensor grid &amp; risk scores
          </h2>
          <SensorGrid machines={machines} />
        </div>
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Zone 1 · Alert log
          </h2>
          <AlertLog alerts={alerts} />
        </div>
      </section>

      {/* ── Zone 2: 3-D visualisations ── */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Zone 2 · 3D entropy spheres{" "}
            <span className="text-slate-600 normal-case">
              (size &amp; colour reflect risk)
            </span>
          </h2>
          <EntropySpheres machines={machines} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Zone 2 · 3D state-space plot{" "}
            <span className="text-slate-600 normal-case">
              (T × V × RPM · red = outlier)
            </span>
          </h2>
          <StateSpacePlot machines={machines} />
        </div>
      </section>

      {/* ── Zone 3: Agent War Room ── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Zone 3 · Agent War Room
        </h2>
        <AgentWarRoom logs={reasoning} />
      </section>
    </main>
  );
}
