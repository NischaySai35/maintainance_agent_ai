import ScrollReveal from '@/components/shared/ScrollReveal';
import { Settings, Car, Package, Zap, Pill, Droplets, Pickaxe, Bot, Target } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Industries — AURA SOVEREIGN',
  description: 'AURA SOVEREIGN serves manufacturing, automotive, power plants, pharma, oil & gas, mining, and robotics industries.',
};

const industries = [
  {
    icon: Settings,
    title: 'Manufacturing',
    desc: 'Precision monitoring for CNC, lathes, and presses. Prevent downtime in high-throughput production lines.',
    benefit: '40% Lower Downtime',
    color: '#00f5ff',
  },
  {
    icon: Car,
    title: 'Automotive',
    desc: 'Monitor welding robots and assembly chains. Detect joint wear before it causes line stoppages.',
    benefit: 'Zero Stoppage Target',
    color: '#a855f7',
  },
  {
    icon: Package,
    title: 'Logistics',
    desc: 'Sorting machines and conveyor health across large fulfillment centers. Peak demand stability.',
    benefit: 'Maximized Throughput',
    color: '#10b981',
  },
  {
    icon: Zap,
    title: 'Energy',
    desc: 'Turbine vibration and thermal anomaly detection for power plants. Grid-scale reliability.',
    benefit: 'Critical Reliability',
    color: '#f59e0b',
  },
  {
    icon: Pill,
    title: 'Pharmaceuticals',
    desc: 'GMP-compliant monitoring of mixing vessels and sterile HVAC systems with full audit trails.',
    benefit: 'Full Compliance',
    color: '#3b82f6',
  },
  {
    icon: Droplets,
    title: 'Oil & Gas',
    desc: 'Remote pump and compressor health in extreme environments. Prevent catastrophic failures.',
    benefit: 'Risk Mitigation',
    color: '#ef4444',
  },
  {
    icon: Pickaxe,
    title: 'Mining',
    desc: 'Heavy machinery and haulage health in remote areas. Resilient monitoring via Shadow Mode.',
    benefit: 'Remote Ops Ready',
    color: '#8b5cf6',
  },
  {
    icon: Bot,
    title: 'Robotics',
    desc: 'Fleet-wide anomaly correlation for cobots and AMR units. Predict joint failure across fleets.',
    benefit: 'Fleet Optimization',
    color: '#06b6d4',
  },
];

export default function IndustriesPage() {
  return (
    <div className="pb-32">
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 hero-radial opacity-40" />
        <div className="container-custom relative z-10">
          <ScrollReveal>
            <div className="text-center mb-24">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-10">
                <Target className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 text-[10px] font-orbitron tracking-[4px] uppercase font-bold">Industry Verticals</span>
              </div>
              <h1 className="font-orbitron font-black text-6xl md:text-8xl gradient-text-cyan mb-8 tracking-tighter uppercase">Vertical Intelligence</h1>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 mt-16">
            {industries.map((ind, i) => (
              <ScrollReveal key={ind.title} delay={i * 0.05}>
                <div
                  className="glass-card p-10 h-full card-hover group border-white/5 hover:border-cyan-500/20"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-10 border border-white/5 group-hover:border-cyan-500/30 transition-all">
                    <ind.icon className="w-7 h-7" style={{ color: ind.color }} />
                  </div>
                  <h3 className="font-orbitron font-bold text-white text-xl mb-4 group-hover:text-cyan-400 transition-colors tracking-tight">
                    {ind.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-10 font-light">{ind.desc}</p>
                  <div
                    className="text-[10px] font-mono px-4 py-2 rounded-xl border uppercase tracking-widest inline-block font-bold"
                    style={{ color: ind.color, borderColor: `${ind.color}30`, background: `${ind.color}05` }}
                  >
                    {ind.benefit}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
