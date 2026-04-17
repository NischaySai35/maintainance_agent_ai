'use client';
import ScrollReveal from '../shared/ScrollReveal';

const team = [
  { name: 'Nischay Sai D R', role: 'AI & Backend Lead', initials: 'NS', color: '#00d9ff', desc: 'Neuro-symbolic engine, physics firewall, multi-agent orchestration.' },
  { name: 'Rishika J R', role: 'Frontend & UX Lead', initials: 'RJ', color: '#a78bfa', desc: 'Dashboard architecture, 3D visualization, and real-time streaming UI.' },
  { name: 'Noti Gayatri', role: 'ML & Data Lead', initials: 'NG', color: '#00ff99', desc: 'TimescaleDB integration, baseline modeling, anomaly classification.' },
];

export default function TeamSection() {
  return (
    <section className="section-padding relative overflow-hidden bg-[#07111f]/20">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-[#2563ff]/[0.02] blur-[160px]" />

      <div className="container-custom relative z-10">
        <div className="text-center mb-16">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/8 bg-white/3 mb-6">
              <span className="text-slate-400 text-xs font-semibold tracking-wider uppercase">The Builders</span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.05}>
            <h2 className="font-heading font-bold text-4xl md:text-5xl text-white tracking-tight">
              Logic <span className="gradient-text-cyan">Weavers</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="text-slate-400 text-lg mt-4 font-light">The team that built a real company product.</p>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {team.map((member, i) => (
            <ScrollReveal key={member.name} delay={i * 0.1}>
              <div
                className="group rounded-2xl border p-8 text-center card-hover relative overflow-hidden"
                style={{ borderColor: `${member.color}12`, background: `#0c1424` }}
              >
                {/* Top glow */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-[60px] transition-opacity duration-500 opacity-20 group-hover:opacity-40" style={{ backgroundColor: member.color }} />

                {/* Avatar */}
                <div className="relative mx-auto mb-5 w-20 h-20">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center font-heading font-bold text-2xl transition-all duration-300 group-hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${member.color}20, ${member.color}08)`,
                      border: `1px solid ${member.color}25`,
                      color: member.color,
                    }}
                  >
                    {member.initials}
                  </div>
                </div>

                <h3 className="font-heading font-bold text-white text-lg">{member.name}</h3>
                <p className="text-sm font-medium mt-1 mb-3" style={{ color: member.color }}>{member.role}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{member.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
