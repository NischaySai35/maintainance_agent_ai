'use client';
import { memo } from 'react';
import type { AlertEntry } from '@/lib/mockData';
import { Bell } from 'lucide-react';

interface LiveAlertsProps {
  alerts: AlertEntry[];
  maxItems?: number;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const severityDot: Record<string, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  info: '#06b6d4',
};

const LiveAlerts = ({ alerts, maxItems = 5 }: LiveAlertsProps) => {
  const recent = alerts.slice(0, maxItems);

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-slate-500" />
          <h3 className="text-sm font-semibold text-white">Live Alerts</h3>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">{alerts.length} total</span>
      </div>
      <div className="divide-y divide-white/[0.04] overflow-hidden">
        {recent.length === 0 ? (
          <div className="px-6 py-10 text-center text-xs text-slate-600 uppercase tracking-widest">No Active Alerts</div>
        ) : (
          recent.map(alert => (
            <div key={alert.id} className="px-6 py-4 flex items-start gap-4 hover:bg-white/[0.02] transition-colors group cursor-default">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                style={{
                  backgroundColor: severityDot[alert.severity] || '#94a3b8',
                  boxShadow: `0 0 8px ${severityDot[alert.severity] || '#94a3b8'}`,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">{alert.machine_id}</span>
                  <span className="text-[10px] font-mono text-slate-600 flex-shrink-0 tabular-nums">
                    {timeAgo(new Date(alert.timestamp))}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 truncate group-hover:text-slate-200 transition-colors leading-relaxed">
                  {alert.issue}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default memo(LiveAlerts);
