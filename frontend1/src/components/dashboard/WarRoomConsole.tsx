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
      <div className="card-header flex-shrink-0">
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
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11px] custom-scrollbar"
      >
        {messages.slice(-30).map((msg, i) => (
          <div key={i} className="flex items-start gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-all group cursor-default">
            <span className="text-slate-700 text-[9px] flex-shrink-0 mt-1 tabular-nums">
              {formatTimestamp(new Date(msg.time))}
            </span>
            <span
              className="text-[10px] font-bold flex-shrink-0 w-20 uppercase tracking-widest text-right pr-2 border-r border-white/[0.04]"
              style={{ color: agentColors[msg.agent] || '#94a3b8' }}
            >
              {msg.agent}
            </span>
            <span className="text-slate-400 text-[11px] leading-relaxed break-words flex-1 group-hover:text-slate-300 transition-colors">
              {msg.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(WarRoomConsole);
