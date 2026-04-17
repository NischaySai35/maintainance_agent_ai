'use client';
import { memo, useMemo } from 'react';
import type { Machine } from '@/lib/constants';
import type { SensorReading } from '@/lib/mockData';
import { getRiskColor, getRiskLabel, formatNumber } from '@/lib/utils';
import { Thermometer, Gauge, BarChart3, Zap, Calendar } from 'lucide-react';

interface MachineHeroCardProps {
  machine: Machine;
  reading: SensorReading | undefined;
}

function RiskGauge({ risk }: { risk: number }) {
  const color = getRiskColor(risk);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (risk / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={radius} className="risk-gauge-track" />
        <circle
          cx="50" cy="50" r={radius}
          className="risk-gauge-fill"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>{risk}</span>
        <span className="text-[9px] text-slate-500 font-medium uppercase">Risk</span>
      </div>
    </div>
  );
}

const MachineHeroCard = ({ machine, reading }: MachineHeroCardProps) => {
  const risk = reading?.riskScore ?? 0;
  const riskLabel = getRiskLabel(risk);
  const riskColor = getRiskColor(risk);

  const metrics = useMemo(() => [
    {
      label: 'Temperature',
      value: reading ? `${formatNumber(reading.temperature_C, 1)}°C` : '--',
      icon: Thermometer,
      color: '#f97316',
    },
    {
      label: 'RPM',
      value: reading ? `${formatNumber(reading.rpm, 0)}` : '--',
      icon: Gauge,
      color: '#06b6d4',
    },
    {
      label: 'Vibration',
      value: reading ? `${formatNumber(reading.vibration_mm_s, 2)} mm/s` : '--',
      icon: BarChart3,
      color: '#a78bfa',
    },
    {
      label: 'Current',
      value: reading ? `${formatNumber(reading.current_A, 1)} A` : '--',
      icon: Zap,
      color: '#fbbf24',
    },
  ], [reading]);

  return (
    <div className="card">
      <div className="card-body">
        {/* Header row */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 min-w-0">
            <RiskGauge risk={risk} />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate tracking-tight">{machine.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{machine.type}</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{machine.location}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className="px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest"
                  style={{ background: `${riskColor}15`, color: riskColor }}
                >
                  {riskLabel}
                </span>
                <span className="px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-white/[0.04] text-slate-500">
                  {reading?.status?.toUpperCase() || 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="hidden sm:flex flex-col items-end gap-1.5 text-right flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-mono tracking-tighter uppercase">
              <Calendar className="w-3 h-3" />
              <span>Last Maint: Apr 12, 2026</span>
            </div>
            <div className="text-[10px] text-slate-600 font-mono tracking-tighter uppercase">
              Operational Time: 1,420h
            </div>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {metrics.map(m => (
            <div
              key={m.label}
              className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 flex flex-col gap-2 transition-all hover:bg-white/[0.04] hover:border-white/[0.08]"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/[0.02]" style={{ color: m.color }}>
                  <m.icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{m.label}</span>
              </div>
              <span className="text-xl font-bold text-white tabular-nums tracking-tight">{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(MachineHeroCard);
