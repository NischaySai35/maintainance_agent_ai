'use client';
import Link from 'next/link';
import { Shield, Brain, Activity } from 'lucide-react';
import ScrollReveal from '../shared/ScrollReveal';

export default function PremiumStatement() {
  return (
    <section className="section-padding relative overflow-hidden bg-[#07111f]/40">
      {/* Decorative orbs */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-[#00d9ff]/[0.025] blur-[130px] rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#7c3aed]/[0.025] blur-[130px] rounded-full" />

      <div className="container-custom relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-10">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/8 bg-white/3">
              <Shield className="w-3.5 h-3.5 text-[#00d9ff]" />
              <span className="text-slate-300 text-xs font-semibold tracking-[3px] uppercase">The Sovereignty Protocol</span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.06}>
            <h2 className="font-heading font-bold text-5xl md:text-6xl lg:text-7xl leading-tight tracking-tight text-white">
              This is not another{' '}
              <span className="gradient-text-cyan">Dashboard.</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <p className="text-slate-400 text-lg md:text-xl font-light leading-relaxed max-w-3xl mx-auto">
              Aura Sovereign doesn't just monitor machines. It <span className="text-white font-medium">understands</span> them, validates reality through the lens of physics, reasons through anomalies with collaborative agents, and acts — autonomously, explainably, and without panic.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.14}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
              {[
                { icon: Shield, title: 'Physics Grounded', desc: 'Immutable thermodynamic laws govern every alert decision.', color: '#00d9ff' },
                { icon: Brain, title: 'Agent Consensus', desc: 'Four AI agents reason together on every single anomaly.', color: '#a78bfa' },
                { icon: Activity, title: 'Zero Logic Noise', desc: 'We only speak when the risk is real. Silence means safety.', color: '#00ff99' },
              ].map(item => (
                <div key={item.title} className="group glass-card p-7 text-left card-hover">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-all" style={{ background: `${item.color}10`, border: `1px solid ${item.color}20` }}>
                    <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: item.color }} />
                  </div>
                  <h3 className="font-heading font-semibold text-white text-base mb-2">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.18}>
            <Link href="/dashboard">
              <button className="btn-primary px-12 py-5 text-base mt-4">
                Launch the Future →
              </button>
            </Link>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
