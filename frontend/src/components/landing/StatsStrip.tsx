'use client';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import ScrollReveal from '../shared/ScrollReveal';

interface StatItemProps {
  value: number;
  suffix: string;
  label: string;
  delay: number;
}

function StatItem({ value, suffix, label, delay }: StatItemProps) {
  const count = useAnimatedCounter(value, 2500, delay);
  return (
    <div className="flex flex-col items-center text-center py-10 px-6 group transition-all hover:bg-white/[0.02] relative">
      <div className="font-heading font-bold text-4xl md:text-5xl text-white mb-3 tracking-tight group-hover:text-[#00d9ff] transition-colors duration-500 tabular-nums">
        {count}<span className="text-[#00d9ff]">{suffix}</span>
      </div>
      <div className="text-slate-500 text-xs uppercase tracking-[3px] font-medium group-hover:text-slate-300 transition-colors">
        {label}
      </div>
      {/* Bottom accent line on hover */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-12 h-[2px] bg-gradient-to-r from-[#00d9ff] to-[#2563ff] transition-all duration-500 rounded-full" />
    </div>
  );
}

export default function StatsStrip() {
  const stats = [
    { value: 99, suffix: '%', label: 'Detection Accuracy', delay: 0 },
    { value: 7, suffix: '', label: 'Active Nodes', delay: 200 },
    { value: 1, suffix: 'Hz', label: 'Sampling Rate', delay: 400 },
    { value: 42, suffix: 'ms', label: 'AI Latency', delay: 600 },
  ];

  return (
    <section className="relative overflow-hidden border-y border-white/[0.04]">
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#00d9ff]/[0.02] via-transparent to-[#7c3aed]/[0.02]" />
      <div className="container-custom relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/[0.04]">
          {stats.map((stat) => (
            <ScrollReveal key={stat.label} delay={stat.delay / 1000}>
              <StatItem {...stat} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
