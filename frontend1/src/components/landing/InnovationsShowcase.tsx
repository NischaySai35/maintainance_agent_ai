'use client';
import { Shield, Brain, Zap, Activity, Cpu, Eye, BarChart3, Layers } from 'lucide-react';
import ScrollReveal from '../shared/ScrollReveal';

const innovations = [
  { icon: Shield, title: 'Physics Inertia Validation', desc: 'Rejects impossible sensor transitions based on thermodynamic inertia laws. Zero false positives.', color: '#00d9ff' },
  { icon: Layers, title: 'Shadow-State Recovery', desc: 'Continues monitoring during outages using digital twin state inference and replay.', color: '#a78bfa' },
  { icon: Activity, title: 'Cross-Machine Intelligence', desc: 'Detects ecosystem-wide anomalies by correlating signals across your entire fleet.', color: '#00ff99' },
  { icon: Brain, title: 'Neuro-Symbolic AI Engine', desc: 'Neural pattern recognition combined with symbolic physics rules for explainable decisions.', color: '#2563ff' },
  { icon: Cpu, title: 'Multi-Agent Consensus', desc: 'Sentinel, Physicist, Historian, and Orchestrator collaborate on every anomaly detected.', color: '#fbbf24' },
  { icon: Zap, title: 'Autonomous Dispatch', desc: 'Books maintenance automatically. Work orders generated without human intervention.', color: '#f97316' },
];

export default function InnovationsShowcase() {
  return (
    <section className="section-padding-lg relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00d9ff]/[0.02] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-[#7c3aed]/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="container-custom relative z-10">
        <div className="text-center mb-20">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00d9ff]/15 bg-[#00d9ff]/5 mb-6">
              <Zap className="w-3.5 h-3.5 text-[#00d9ff]" />
              <span className="text-[#00d9ff] text-xs font-semibold tracking-wider uppercase">Core Capabilities</span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.05}>
            <h2 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl text-white tracking-tight leading-tight">
              Sovereign{' '}
              <span className="gradient-text-cyan">Intelligence</span>
            </h2>
          </ScrollReveal>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {innovations.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 0.06}>
              <div className="group glass-card p-8 h-full card-hover flex flex-col items-start text-left relative overflow-hidden">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110"
                  style={{ background: `${item.color}10`, border: `1px solid ${item.color}20` }}
                >
                  <item.icon className="w-5 h-5 transition-transform" style={{ color: item.color }} />
                </div>

                <h3 className="font-heading font-semibold text-white text-lg mb-3 tracking-tight group-hover:text-[#00d9ff] transition-colors">
                  {item.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed flex-1">{item.desc}</p>

                {/* Bottom glow on hover */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(90deg, transparent, ${item.color}40, transparent)` }}
                />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
