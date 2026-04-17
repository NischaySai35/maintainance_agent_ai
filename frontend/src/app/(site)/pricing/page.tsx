import ScrollReveal from '@/components/shared/ScrollReveal';
import { Check, ArrowRight, Wallet } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — AURA SOVEREIGN',
  description: 'Simple, transparent pricing for AURA SOVEREIGN predictive maintenance platform.',
};

const plans = [
  {
    name: 'Starter',
    tagline: 'Pilot & Small Facilities',
    price: '$299',
    period: '/mo',
    color: '#64748b',
    featured: false,
    features: [
      'Up to 4 Industrial Nodes',
      '1Hz Live Stream Data',
      'Basic Spike Detection',
      'Email & Webhook Alerts',
      '7-Day Data Retention',
      'Community Support',
    ],
    cta: 'Start Free Pilot',
    href: '/signup',
  },
  {
    name: 'Scale',
    tagline: 'Precision Manufacturing',
    price: '$899',
    period: '/mo',
    color: '#00f5ff',
    featured: true,
    features: [
      'Up to 24 Industrial Nodes',
      'Physics Firewall Integration',
      'Multi-Agent Reasoning Logs',
      'Autonomous Job Dispatch',
      '90-Day Data Retention',
      'Priority Response (4h)',
    ],
    cta: 'Begin 14-Day Trial',
    href: '/signup',
  },
  {
    name: 'Sovereign',
    tagline: 'Enterprise Factory Floor',
    price: 'Custom',
    period: '',
    color: '#a855f7',
    featured: false,
    features: [
      'Unlimited Industrial Nodes',
      'On-Premise Deployment',
      'Custom AI Pattern Tuning',
      'Cross-Machine Correlation',
      'Indefinite Data Retention',
      'Dedicated Logic Weaver',
    ],
    cta: 'Contact Sales',
    href: '/contact',
  },
];

export default function PricingPage() {
  return (
    <div className="pb-32">
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 hero-radial opacity-40" />
        <div className="container-custom relative z-10">
          <ScrollReveal>
            <div className="text-center mb-32">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-10">
                <Wallet className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 text-[10px] font-orbitron tracking-[4px] uppercase font-bold">Pricing models</span>
              </div>
              <h1 className="font-orbitron font-black text-6xl md:text-8xl gradient-text-cyan mb-0 tracking-tighter uppercase">Scalable Intelligence</h1>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-7xl mx-auto mt-48">
            {plans.map((plan, i) => (
              <ScrollReveal key={plan.name} delay={i * 0.1}>
                <div
                  className={`glass-card p-12 lg:p-14 h-full flex flex-col border transition-all duration-500 relative group ${
                    plan.featured ? 'border-cyan-500/40 glow-cyan scale-105 z-10 bg-white/[0.05]' : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                      <span className="px-6 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-[10px] font-orbitron font-black tracking-[3px] uppercase shadow-xl">
                        Most Advanced
                      </span>
                    </div>
                  )}

                  <div className="mb-12">
                    <div className="font-orbitron font-black text-sm mb-3 tracking-[4px] uppercase" style={{ color: plan.color }}>
                      {plan.name}
                    </div>
                    <div className="text-slate-500 text-xs mb-10 font-mono tracking-wider">{plan.tagline}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-orbitron font-black text-6xl text-white tracking-tighter">{plan.price}</span>
                      {plan.period && <span className="text-slate-600 text-sm font-mono">{plan.period}</span>}
                    </div>
                  </div>

                  <ul className="space-y-6 mb-16 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-4 text-sm text-slate-400 font-light leading-snug">
                        <Check className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: plan.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.href}>
                    <button
                      className={`w-full py-5 rounded-2xl font-orbitron font-black text-xs tracking-[3px] uppercase transition-all flex items-center justify-center gap-3 ${
                        plan.featured
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg hover:shadow-cyan-500/30'
                          : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-40 text-center">
            <p className="text-slate-700 text-xs font-mono tracking-[6px] uppercase mb-12">Trusted by Industry Leaders</p>
            <div className="flex flex-wrap justify-center items-center gap-20 opacity-20 grayscale contrast-150">
              <span className="font-orbitron font-black text-3xl tracking-tighter">MACHINA</span>
              <span className="font-orbitron font-black text-3xl tracking-tighter">VOLT.SYS</span>
              <span className="font-orbitron font-black text-3xl tracking-tighter">KINETIC</span>
              <span className="font-orbitron font-black text-3xl tracking-tighter">OMEGA.FAB</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
