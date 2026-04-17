'use client';
import { memo } from 'react';
import type { Machine } from '@/lib/constants';
import type { SensorReading } from '@/lib/mockData';
import { getRiskColor, getRiskLabel, formatNumber } from '@/lib/utils';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface MachineCardProps {
  machine: Machine;
  reading: SensorReading | undefined;
  sparkline: { value: number }[];
  isSelected: boolean;
  onClick: () => void;
}

const MachineCard = ({ machine, reading, sparkline, isSelected, onClick }: MachineCardProps) => {
  const isBrowser = typeof window !== 'undefined';

  const risk = reading?.riskScore ?? 0;
  const riskColor = getRiskColor(risk);
  const statusColor =
    reading?.status === 'fault' ? '#ef4444' :
    reading?.status === 'warning' ? '#f59e0b' :
    reading?.status === 'shadow' ? '#6b7280' : '#10b981';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl p-4 border transition-all duration-200 cursor-pointer group ${
        isSelected
          ? 'bg-cyan-500/[0.08] border-cyan-500/40 shadow-[0_0_20px_rgba(0,217,255,0.05)]'
          : 'bg-transparent border-transparent hover:bg-white/[0.03] hover:border-slate-800'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className="relative flex-shrink-0">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
          />
          {isSelected && (
            <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: statusColor }} />
          )}
        </div>

        {/* Machine identification */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold text-white truncate tracking-tight">{machine.name}</span>
            <span className="text-xs font-mono font-bold tabular-nums flex-shrink-0" style={{ color: riskColor }}>
              {risk}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500 truncate uppercase tracking-wider font-medium">{machine.type}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest flex-shrink-0" style={{ color: riskColor }}>
              {getRiskLabel(risk)}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Visualization */}
      <div className="h-10 mt-3 -mx-2 opacity-60 group-hover:opacity-100 transition-opacity">
        {isBrowser ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={isSelected ? '#00d9ff' : riskColor}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <YAxis hide domain={['auto', 'auto']} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full" />
        )}
      </div>

      {/* Standardized Metric Row */}
      <div className="grid grid-cols-3 gap-2 mt-2 border-t border-white/[0.04] pt-2">
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-600 uppercase tracking-tighter">Temp</span>
          <span className="text-[10px] font-mono text-slate-400 font-bold tabular-nums">
            {reading ? `${formatNumber(reading.temperature_C, 0)}°C` : '--'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-600 uppercase tracking-tighter">RPM</span>
          <span className="text-[10px] font-mono text-slate-400 font-bold tabular-nums">
            {reading ? `${formatNumber(reading.rpm, 0)}` : '--'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-600 uppercase tracking-tighter">Vibration</span>
          <span className="text-[10px] font-mono text-slate-400 font-bold tabular-nums">
            {reading ? `${formatNumber(reading.vibration_mm_s, 1)}` : '--'}
          </span>
        </div>
      </div>
    </button>
  );
};

export default memo(MachineCard);
