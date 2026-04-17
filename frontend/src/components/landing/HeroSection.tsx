'use client';
import { motion } from 'framer-motion';
import { ArrowRight, Play, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import ParticleBackground from '../shared/ParticleBackground';
import ScrollReveal from '../shared/ScrollReveal';

const trustBadges = [
  { label: '99% Detection Accuracy', icon: '✓' },
  { label: '1Hz Real-Time Streams', icon: '✓' },
  { label: '42ms Latency', icon: '✓' },
  { label: 'Autonomous Scheduling', icon: '✓' },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Layered background */}
      <div className="absolute inset-0 z-0">
        <ParticleBackground count={50} />
        <div className="absolute inset-0 hero-radial" />
        {/* Perspective grid floor */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[50vh] opacity-20"
          style={{
            background: 'linear-gradient(transparent 0%, rgba(0,217,255,0.03) 100%)',
            backgroundImage: `
              linear-gradient(rgba(0,217,255,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,217,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            transform: 'perspective(500px) rotateX(45deg)',
            transformOrigin: 'bottom center',
          }}
        />
        {/* Light beams */}
        <div className="absolute top-0 left-1/4 w-px h-[60vh] bg-gradient-to-b from-[#00d9ff]/20 via-[#00d9ff]/05 to-transparent" />
        <div className="absolute top-0 right-1/3 w-px h-[50vh] bg-gradient-to-b from-[#7c3aed]/15 via-transparent to-transparent" />
      </div>

      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-[#00d9ff]/20 to-transparent animate-scan" />
      </div>

      <div className="container-custom relative z-10 py-32 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center min-h-[85vh]">

          {/* Left — Copy */}
          <div className="space-y-8">


            <ScrollReveal delay={0.1}>
              <h1 className="font-heading font-bold text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
                <span className="text-white block">AURA</span>
                <span className="gradient-text-glow block">SOVEREIGN</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-lg font-light">
                From noisy sensor alerts to explainable autonomous decisions — powered by{' '}
                <span className="text-white font-medium">NeuroSymbolic AI</span>.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link href="/dashboard">
                  <button className="btn-primary flex items-center justify-center gap-2 px-8 py-4 text-base w-full sm:w-auto">
                    Launch Console <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <button className="btn-ghost flex items-center justify-center gap-2 px-8 py-4 text-base">
                  <Play className="w-4 h-4" /> Watch Demo
                </button>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-4">
                {trustBadges.map(b => (
                  <div key={b.label} className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff99]" />
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Right — 3D Sphere Visualization */}
          <ScrollReveal delay={0.15} direction="right">
            <div className="relative flex items-center justify-center scale-75 md:scale-100">
              {/* Outer glow rings */}
              <div className="absolute w-80 h-80 md:w-[420px] md:h-[420px] rounded-full border border-[#00d9ff]/10" />
              <div className="absolute w-64 h-64 md:w-[340px] md:h-[340px] rounded-full border border-[#2563ff]/8 animate-spin-slow" />

              {/* Core sphere with persistent rotation */}
              <motion.div
                className="relative w-56 h-56 md:w-72 md:h-72"
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              >
                {/* Glowing sphere */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00d9ff]/20 via-[#2563ff]/15 to-[#7c3aed]/20 backdrop-blur-sm" />
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#030712] to-[#07111f] border border-[#00d9ff]/15 flex items-center justify-center">
                  <motion.div
                    className="text-center"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                  >
                    <div className="text-3xl md:text-4xl font-heading font-bold text-white">AI</div>
                    <div className="text-xs text-[#00d9ff] font-medium tracking-wider mt-1">NEURAL CORE</div>
                  </motion.div>
                </div>

                {/* Pulse rings */}
                <div className="absolute inset-0 rounded-full border border-[#00d9ff]/20" style={{ animation: 'ripple-out 3s ease-out infinite' }} />
                <div className="absolute inset-0 rounded-full border border-[#00d9ff]/15" style={{ animation: 'ripple-out 3s ease-out 1s infinite' }} />

                {/* Orbiting data nodes */}
                {[
                  { label: 'TEMP', color: '#f97316', angle: 0 },
                  { label: 'RPM', color: '#00d9ff', angle: 90 },
                  { label: 'VIB', color: '#a78bfa', angle: 180 },
                  { label: 'AMP', color: '#fbbf24', angle: 270 },
                ].map((node) => (
                  <div
                    key={node.label}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      transform: `rotate(${node.angle}deg) translateX(160px) rotate(-${node.angle}deg)`,
                    }}
                  >
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                      className="w-10 h-10 -ml-5 -mt-5 rounded-lg flex items-center justify-center text-[9px] font-bold tracking-wider border backdrop-blur-sm"
                      style={{
                        background: `${node.color}15`,
                        borderColor: `${node.color}30`,
                        color: node.color,
                      }}
                    >
                      {node.label}
                    </motion.div>
                  </div>
                ))}
              </motion.div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
