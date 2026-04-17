'use client';
import { useEffect, useRef, memo } from 'react';
import { formatTimestamp } from '@/lib/utils';
import { Terminal } from 'lucide-react';

interface WarRoomConsoleProps {
  messages: { agent: string; message: string; time: string }[];
}

const agentColors: Record<string, string> = {
  Sentinel: '#06b6d4',
  Physicist: '#a78bfa',
  Historian: '#fbbf24',
  Orchestrator: '#34d399',
  System: '#475569',
};

const WarRoomConsole = ({ messages }: WarRoomConsoleProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="card flex flex-col h-full">
      <div className="card-header flex-shrink-0 px-5 py-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
          <h3 className="text-sm font-semibold text-white">AI War Room</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-medium">LIVE</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3 font-mono text-[11px] custom-scrollbar"
      >
        {messages.slice(-30).map((msg, i) => (
          <div key={i} className="grid grid-cols-[92px_96px_minmax(0,1fr)] items-center gap-4 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03] transition-all group cursor-default">
            <span className="justify-self-center text-center text-slate-700 text-[9px] leading-tight tabular-nums">
              {formatTimestamp(new Date(msg.time))}
            </span>
            <span
              className="justify-self-center text-center text-[10px] font-bold uppercase tracking-widest leading-tight"
              style={{ color: agentColors[msg.agent] || '#94a3b8' }}
            >
              {msg.agent}
            </span>
            <span className="text-slate-400 text-[11px] leading-relaxed break-words min-w-0 group-hover:text-slate-300 transition-colors">
              {msg.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(WarRoomConsole);
