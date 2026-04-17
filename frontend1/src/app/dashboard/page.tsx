'use client';
import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSimulatedStream } from '@/hooks/useSimulatedStream';
import MachineCard from '@/components/dashboard/MachineCard';
import MachineHeroCard from '@/components/dashboard/MachineHeroCard';
import TabbedAnalytics from '@/components/dashboard/TabbedAnalytics';
import TrendsChart from '@/components/dashboard/TrendsChart';
import DiagnosticsPanel from '@/components/dashboard/DiagnosticsPanel';
import LiveAlerts from '@/components/dashboard/LiveAlerts';
import WarRoomConsole from '@/components/dashboard/WarRoomConsole';
import PriorityQueue from '@/components/dashboard/PriorityQueue';
import ActionCenter from '@/components/dashboard/ActionCenter';
import { MACHINES } from '@/lib/constants';
import { Search } from 'lucide-react';

// Lazy-load 3D component
const EntropySphere = dynamic(() => import('@/components/3d/EntropySphere'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-white/[0.02] rounded-xl animate-pulse" />,
});

const TABS = [
  { id: 'trends', label: 'Trends' },
  { id: 'entropy', label: 'Entropy Sphere' },
  { id: 'diagnostics', label: 'Diagnostics' },
];

export default function DashboardPage() {
  const {
    readings,
    sparklines,
    alerts,
    agentMessages,
    shadowMachines,
    injectChaos,
    toggleShadow,
    triggerSurge,
    dismissSurge,
  } = useSimulatedStream();

  const [selectedMachine, setSelectedMachine] = useState(MACHINES[0].id);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedMachineObj = useMemo(
    () => MACHINES.find(m => m.id === selectedMachine) ?? MACHINES[0],
    [selectedMachine]
  );

  const filteredMachines = useMemo(() => {
    if (!searchQuery.trim()) return MACHINES;
    const q = searchQuery.toLowerCase();
    return MACHINES.filter(m =>
      m.id.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      m.type.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelectMachine = useCallback((id: string) => setSelectedMachine(id), []);

  // Alert count for header (verified only)
  const verifiedAlertCount = useMemo(
    () => alerts.filter(a => a.type === 'verified').length,
    [alerts]
  );

  return (
    <div className="p-6 max-w-[1920px] mx-auto h-[calc(100vh-64px)] overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">

        {/* ─── LEFT SIDEBAR: Fleet Monitoring ─── */}
        <aside className="lg:col-span-3 flex flex-col min-h-0">
          <div className="card flex flex-col h-full overflow-hidden">
            <div className="card-header flex-shrink-0">
              <h2 className="text-[11px] font-bold text-white uppercase tracking-[2px]">Fleet Intelligence</h2>
              <span className="text-[10px] text-slate-500 font-mono">{MACHINES.length} Nodes Online</span>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-white/[0.04] flex-shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter nodes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl text-xs text-slate-300 pl-9 pr-4 py-2.5 focus:outline-none focus:border-cyan-500/40 transition-all placeholder:text-slate-700"
                />
              </div>
            </div>

            {/* Machine list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {filteredMachines.map(machine => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  reading={readings[machine.id]}
                  sparkline={sparklines[machine.id] ? sparklines[machine.id].map(v => ({ value: v })) : []}
                  isSelected={selectedMachine === machine.id}
                  onClick={() => handleSelectMachine(machine.id)}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* ─── CENTER PANEL: Analytics & Insight ─── */}
        <section className="lg:col-span-6 flex flex-col gap-6 min-h-0 overflow-y-auto custom-scrollbar pr-1">
          {/* Selected Machine Hero */}
          <MachineHeroCard
            machine={selectedMachineObj}
            reading={readings[selectedMachine]}
          />

          {/* Tabbed Analytics */}
          <div className="flex-1 min-h-0">
            <TabbedAnalytics tabs={TABS}>
              {{
                trends: (
                  <TrendsChart
                    sparklineData={sparklines[selectedMachine] || []}
                    machineId={selectedMachine}
                  />
                ),
                entropy: (
                  <div className="h-[460px]">
                    <EntropySphere
                      machineId={selectedMachine}
                      riskScore={readings[selectedMachine]?.riskScore ?? 0}
                      isShadow={shadowMachines.has(selectedMachine)}
                    />
                  </div>
                ),
                diagnostics: (
                  <DiagnosticsPanel reading={readings[selectedMachine]} />
                ),
              }}
            </TabbedAnalytics>
          </div>
        </section>

        {/* ─── RIGHT SIDEBAR: Agentic Ops & Actions ─── */}
        <aside className="lg:col-span-3 flex flex-col gap-6 min-h-0 overflow-y-auto custom-scrollbar pl-1">
          {/* Live Alerts */}
          <LiveAlerts alerts={alerts} maxItems={4} />

          {/* AI War Room */}
          <div className="h-[320px] flex-shrink-0">
            <WarRoomConsole messages={agentMessages} />
          </div>

          {/* Risk Priority Queue */}
          <div className="flex-shrink-0">
            <PriorityQueue
              readings={readings}
              onSelectMachine={handleSelectMachine}
            />
          </div>

          {/* Action Center */}
          <div className="flex-shrink-0">
            <ActionCenter
              onChaos={injectChaos}
              onToggleShadow={toggleShadow}
              onTriggerSurge={triggerSurge}
              onReset={dismissSurge}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
