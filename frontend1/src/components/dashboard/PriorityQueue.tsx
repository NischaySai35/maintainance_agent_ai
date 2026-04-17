'use client';
import { memo } from 'react';
import type { SensorReading } from '@/lib/mockData';
import { MACHINES } from '@/lib/constants';
import { getRiskColor } from '@/lib/utils';
import { ListOrdered } from 'lucide-react';

interface PriorityQueueProps {
  readings: Record<string, SensorReading>;
  onSelectMachine?: (id: string) => void;
}

const PriorityQueue = ({ readings, onSelectMachine }: PriorityQueueProps) => {
  const sorted = [...MACHINES].sort((a, b) => {
    const ra = readings[a.id]?.riskScore ?? 0;
    const rb = readings[b.id]?.riskScore ?? 0;
    return rb - ra;
  });

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-3.5 h-3.5 text-slate-500" />
          <h3 className="text-sm font-semibold text-white">Risk Queue</h3>
        </div>
      </div>
      <div className="card-body p-3 space-y-1">
        {sorted.slice(0, 8).map((machine, i) => {
          const score = readings[machine.id]?.riskScore ?? 0;
          const color = getRiskColor(score);

          return (
            <button
              key={machine.id}
              onClick={() => onSelectMachine?.(machine.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all group text-left"
            >
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0 font-mono"
                style={{ background: `${color}15`, color }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-white truncate font-bold uppercase tracking-wider">{machine.id}</span>
              </div>
              <span className="text-xs font-mono font-bold tabular-nums" style={{ color }}>
                {score}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default memo(PriorityQueue);
