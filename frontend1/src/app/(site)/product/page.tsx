import SectionHeader from '@/components/shared/SectionHeader';
import ScrollReveal from '@/components/shared/ScrollReveal';
import { Shield, Brain, Zap, Clock, Search, Workflow, Database, Layers, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Product — AURA SOVEREIGN',
  description: 'The anatomy of industrial intelligence. Explore the 4-layer architecture of AURA SOVEREIGN.',
};

const layers = [
  {
    icon: Database,
    title: 'Ingestion Layer',
    desc: 'High-frequency 1Hz sensor telemetry processing with sub-ms jitter handling.',
    features: ['Universal industrial protocol support', 'Lossless compression', 'Buffer persistence'],
    color: '#3b82f6',
  },
  {
    icon: Shield,
    title: 'Physics Firewall',
    desc: 'The only AI system that validates anomalies against the immutable laws of thermodynamics.',
    features: ['Thermal inertia validation', 'Inertial limit checks', 'Zero-logic noise suppression'],
    color: '#ef4444',
  },
  {
    icon: Brain,
    title: 'Agentic Reasoning',
    desc: 'Collaborative AI agents (Sentinel, Physicist, Historian) debate anomaly validity before acting.',
    features: ['Multi-agent consensus', 'Reasoning trace output', 'Contextual historical matching'],
    color: '#a855f7',
  },
  {
    icon: Workflow,
    title: 'Autonomous Action',
    desc: 'Direct integration with work-order systems for autonomous maintenance dispatch.',
    features: ['Auto-job creation', 'Criticality prioritization', 'SLA-driven notifications'],
    color: '#10b981',
  },
];

export default function ProductPage() {
  return (
    <div className="pb-32">
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 hero-radial opacity-40" />
        <div className="container-custom relative z-10 text-center">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-12">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 text-[10px] font-orbitron tracking-[4px] uppercase font-bold">Architecture Deep Dive</span>
            </div>
            <h1 className="font-orbitron font-black text-6xl md:text-8xl gradient-text-cyan mb-12 tracking-tighter">
              Industrial Intelligence.<br />Redefined.
            </h1>
            <div className="max-w-3xl mx-auto h-1 w-24 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mt-12" />
          </ScrollReveal>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24">
            {layers.map((layer, i) => (
              <ScrollReveal key={layer.title} delay={i * 0.1}>
                <div className="glass-card p-12 lg:p-16 h-full flex flex-col group border-white/5 hover:border-cyan-500/20">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-10 bg-slate-900 border border-white/5 group-hover:border-cyan-500/30 transition-all">
                    <layer.icon className="w-8 h-8" style={{ color: layer.color }} />
                  </div>
                  <h3 className="font-orbitron font-bold text-3xl text-white mb-6 tracking-tight">{layer.title}</h3>
                  <p className="text-slate-500 text-lg leading-relaxed mb-10 font-light">{layer.desc}</p>

                  <ul className="space-y-4 mt-auto">
                    {layer.features.map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm text-slate-400 font-mono">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: layer.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>


        </div>
      </section>
    </div>
  );
}
