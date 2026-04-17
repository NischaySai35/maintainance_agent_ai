import ScrollReveal from '@/components/shared/ScrollReveal';
import type { Metadata } from 'next';
import { Cog, Shield, Zap, Search, Activity, Cpu, Database } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works — AURA SOVEREIGN',
  description: 'Understand the 7-step autonomous pipeline that powers AURA SOVEREIGN predictive maintenance.',
};

const steps = [
  {
    number: '01',
    icon: Database,
    title: 'Data Ingestion',
    subtitle: 'High-frequency signal acquisition',
    description: 'A fleet of 7 industrial machines is monitored at 1Hz. Each stream operates in an independent async lane with built-in dead-reckoning fallback logic for connectivity gaps.',
    tags: ['SSE', 'Async Lane', '1Hz Sampling'],
    color: '#00f5ff',
  },
  {
    number: '02',
    icon: Shield,
    title: 'Physics Firewall',
    subtitle: 'Bi-modal noise filtering',
    description: 'Every reading passes through a physical-inertia validator. Readings that violate thermodynamic or mechanical constraints (e.g., impossible RPM jumps or temperature spikes) are rejected before reaching the AI core.',
    tags: ['PIV Engine', 'Entropy Filter'],
    color: '#a855f7',
  },
  {
    number: '03',
    icon: Activity,
    title: 'Dynamic Baselines',
    subtitle: 'Context-aware profiling',
    description: 'The system computes machine-specific rolling baselines across multiple operational regimes (idle, active, peak). Anomaly detection is based on Δσ from these local profiles, not global thresholds.',
    tags: ['Regime Mapping', 'Rolling Baselines'],
    color: '#f59e0b',
  },
  {
    number: '04',
    icon: Cpu,
    title: 'Multi-Agent Analysis',
    subtitle: 'Collaborative reasoning',
    description: 'Specialized agents (Sentinel, Physicist, Historian, Orchestrator) analyze anomalies. Each agent provides a unique perspective—from physical feasibility to historical pattern matching—to ensure trust.',
    tags: ['LangGraph', 'Neuro-Symbolic'],
    color: '#10b981',
  },
  {
    number: '05',
    icon: Search,
    title: 'Risk Scoring',
    subtitle: 'Severity & Urgency quantification',
    description: 'Anomalies are scored 0–100 based on magnitude, persistence, and multi-sensor correlation. This feeds a live Priority Queue, ensuring engineers focus on the highest-impact threats first.',
    tags: ['Risk Profile', 'Priority Logic'],
    color: '#ef4444',
  },
  {
    number: '06',
    icon: Zap,
    title: 'Autonomous Action',
    subtitle: 'Closed-loop execution',
    description: 'When risk exceeds thresholds, the system autonomously triggers POST /schedule-maintenance. Work orders are dispatched to the assigned team with full diagnostics attached.',
    tags: ['Auto-Dispatch', 'Webhooks'],
    color: '#3b82f6',
  },
  {
    number: '07',
    icon: Cog,
    title: 'XAI Feedback',
    subtitle: 'Human-in-the-loop trust',
    description: 'Every autonomous decision includes the full reasoning trace. Engineers can inspect "why" a decision was made, bridging the gap between machine intelligence and human expertise.',
    tags: ['Explainable AI', 'Reasoning Trace'],
    color: '#6366f1',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="pb-40">
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 hero-radial opacity-40" />
        <div className="container-custom relative z-10">
          <div className="text-center mb-32">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-10">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-400 text-[10px] font-orbitron tracking-[4px] uppercase font-bold">The Pipeline</span>
              </div>
              <h1 className="font-orbitron font-black text-6xl md:text-8xl gradient-text-cyan mb-8 tracking-tighter uppercase leading-none">
                How It Works
              </h1>
              <p className="text-slate-500 text-lg md:text-xl font-light max-w-2xl mx-auto leading-relaxed mt-10">
                From raw sensor noise to autonomous maintenance execution. Every step is physics-validated and fully explainable.
              </p>
            </ScrollReveal>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Steps Timeline */}
            <div className="space-y-24 md:space-y-40">
              {steps.map((step, i) => (
                <ScrollReveal key={step.number} delay={i * 0.1}>
                  <div className={`flex flex-col md:flex-row items-center gap-16 md:gap-24 ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
                    {/* Visual Side */}
                    <div className="flex-1 w-full md:w-auto">
                      <div className="glass-card p-16 md:p-24 border border-white/5 relative overflow-hidden group hover:border-cyan-500/20 transition-all flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
                        <step.icon className="w-24 h-24 md:w-32 md:h-32 transition-transform duration-500 group-hover:scale-110" style={{ color: step.color }} />
                        <div className="absolute top-8 right-8 font-orbitron font-black text-6xl opacity-10" style={{ color: step.color }}>{step.number}</div>
                      </div>
                    </div>

                    {/* Content Side */}
                    <div className="flex-1 space-y-8">
                      <div>
                        <div className="text-xs font-mono mb-4 uppercase tracking-[4px] font-bold" style={{ color: step.color }}>{step.subtitle}</div>
                        <h2 className="font-orbitron font-black text-4xl text-white mb-6 tracking-tight">{step.title}</h2>
                        <p className="text-slate-500 text-lg leading-relaxed font-light">{step.description}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                        {step.tags.map(tag => (
                          <span key={tag} className="px-4 py-2 rounded-xl text-[10px] font-mono border border-white/5 bg-white/5 text-slate-400 uppercase tracking-widest">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
