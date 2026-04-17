'use client';
import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';
import ScrollReveal from '../shared/ScrollReveal';

export default function FinalCTA() {
  return (
    <section className="section-padding relative overflow-hidden">
      {/* Neural grid background */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      {/* Glowing center orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-r from-[#00d9ff]/5 via-[#2563ff]/5 to-[#7c3aed]/5 blur-[120px]" />
      {/* Top/bottom border lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d9ff]/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7c3aed]/20 to-transparent" />

      <div className="container-custom relative z-10 text-center">
        <ScrollReveal>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00d9ff]/15 bg-[#00d9ff]/5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d9ff] animate-pulse" />
            <span className="text-[#00d9ff] text-xs font-semibold tracking-wider uppercase">Ready to Deploy</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <h2 className="font-heading font-bold text-5xl md:text-6xl lg:text-7xl text-white tracking-tight leading-tight max-w-4xl mx-auto">
            Ready to Let Machines{' '}
            <span className="gradient-text-glow">Speak Clearly?</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="text-slate-400 text-xl mt-6 max-w-2xl mx-auto font-light leading-relaxed">
            Launch the most advanced predictive maintenance intelligence platform ever built. Physics-validated. Autonomous. Explainable.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link href="/dashboard">
              <button className="btn-primary flex items-center justify-center gap-2 px-10 py-5 text-base w-full sm:w-auto">
                Launch Console <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <button className="btn-ghost flex items-center justify-center gap-2 px-10 py-5 text-base">
              <Calendar className="w-4 h-4" /> Schedule Demo
            </button>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="text-slate-600 text-sm mt-8 font-mono">No credit card. No setup. Just intelligence.</p>
        </ScrollReveal>
      </div>
    </section>
  );
}
