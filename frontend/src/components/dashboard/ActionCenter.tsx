'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, FileText, Bug, RotateCcw, Settings, CheckCircle2 } from 'lucide-react';
import { MACHINES } from '@/lib/constants';

interface ActionCenterProps {
  onChaos: (machineId: string) => void;
  onReset: () => void;
}

export default function ActionCenter({ onChaos, onReset }: ActionCenterProps) {
  const [workOrderShown, setWorkOrderShown] = useState(false);
  const [chaosTarget, setChaosTarget] = useState(MACHINES[0].id);

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-slate-500" />
          <h3 className="text-sm font-semibold text-white">Actions</h3>
        </div>
      </div>

      <div className="card-body space-y-4">
        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setWorkOrderShown(true)}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10 text-emerald-400 hover:bg-emerald-500/[0.1] hover:border-emerald-500/30 transition-all group h-[84px]"
          >
            <Wrench className="w-5 h-5 group-hover:rotate-45 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Schedule</span>
          </button>

          <button
            onClick={() => alert('Work order WO-2026-A generated.')}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/10 text-cyan-400 hover:bg-cyan-500/[0.1] hover:border-cyan-500/30 transition-all group h-[84px]"
          >
            <FileText className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Order</span>
          </button>

          <button
            onClick={() => onChaos(chaosTarget)}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/10 text-amber-400 hover:bg-amber-500/[0.1] hover:border-amber-500/30 transition-all group h-[84px]"
          >
            <Bug className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Chaos</span>
          </button>

          <button
            onClick={onReset}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-500 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group h-[84px]"
          >
            <RotateCcw className="w-5 h-5 group-hover:-rotate-90 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Reset</span>
          </button>
        </div>

        {/* Chaos target selector */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-[2px]">Target Node</span>
          <select
            value={chaosTarget}
            onChange={e => setChaosTarget(e.target.value)}
            className="flex-1 bg-black/40 border border-white/[0.06] rounded-lg text-[10px] text-slate-400 px-3 py-2 focus:outline-none focus:border-cyan-500/40 font-mono transition-all"
          >
            {MACHINES.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
          </select>
        </div>
      </div>

      {/* Work Order Modal */}
      <AnimatePresence>
        {workOrderShown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={() => setWorkOrderShown(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card max-w-md w-full p-6 border-emerald-500/20 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Maintenance Scheduled</h3>
                  <p className="text-xs text-slate-500">Work Order WO-2026-0417-A</p>
                </div>
              </div>

              <div className="space-y-3 text-sm border-y border-white/[0.04] py-5 my-4">
                <div className="flex justify-between"><span className="text-slate-500">Node</span><span className="text-cyan-400 font-medium">{chaosTarget}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Window</span><span className="text-white">Tomorrow 09:00</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="text-white font-medium">Bearing Service</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Avoided Cost</span><span className="text-emerald-400 font-medium">$42,500</span></div>
              </div>

              <button
                onClick={() => setWorkOrderShown(false)}
                className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-emerald-400 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
