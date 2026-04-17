'use client';
import ScrollReveal from '../shared/ScrollReveal';

const techCategories = [
  {
    category: 'Frontend',
    color: '#00d9ff',
    chips: ['Next.js 16', 'Tailwind CSS', 'Framer Motion', 'Three.js', 'Recharts'],
  },
  {
    category: 'Backend',
    color: '#2563ff',
    chips: ['FastAPI', 'Asyncio', 'SSE Streams', 'REST API'],
  },
  {
    category: 'AI / Intelligence',
    color: '#a78bfa',
    chips: ['PyTorch', 'LangGraph', 'Gemini', 'Neuro-Symbolic Engine', 'Physics Firewall'],
  },
  {
    category: 'Data',
    color: '#00ff99',
    chips: ['TimescaleDB', 'ChromaDB', 'Vector Search', 'Time-Series'],
  },
];

export default function TechStack() {
  return (
    <section className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 hero-radial opacity-50" />

      <div className="container-custom relative z-10">
        <div className="text-center mb-16">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/8 bg-white/3 mb-6">
              <span className="text-slate-400 text-xs font-semibold tracking-wider uppercase">⚙ Built With</span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.05}>
            <h2 className="font-heading font-bold text-4xl md:text-5xl text-white tracking-tight">
              Enterprise-Grade <span className="gradient-text-cyan">Tech Stack</span>
            </h2>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {techCategories.map((cat, i) => (
            <ScrollReveal key={cat.category} delay={i * 0.08}>
              <div
                className="group rounded-2xl border p-6 h-full card-hover"
                style={{
                  borderColor: `${cat.color}12`,
                  background: `linear-gradient(135deg, ${cat.color}04 0%, #0c1424 50%)`,
                }}
              >
                <div className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: cat.color }}>
                  {cat.category}
                </div>
                <div className="flex flex-wrap gap-2">
                  {cat.chips.map(chip => (
                    <span
                      key={chip}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all group-hover:scale-[1.02]"
                      style={{
                        background: `${cat.color}0c`,
                        border: `1px solid ${cat.color}18`,
                        color: `${cat.color}`,
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
