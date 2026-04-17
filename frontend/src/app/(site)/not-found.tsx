import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Signal Lost | AURA SOVEREIGN',
  description: 'Page not found.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-dense opacity-30" />
      <div className="absolute inset-0 hero-radial" />

      <div className="relative z-10 text-center max-w-lg mx-auto">
        {/* Glitching machine visual */}
        <div className="relative w-40 h-40 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping" />
          <div className="absolute inset-4 rounded-full border border-red-500/20 animate-spin-slow" />
          <div className="absolute inset-8 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <span className="font-orbitron font-black text-3xl text-red-400 animate-pulse">!</span>
          </div>
        </div>

        <div className="text-slate-700 font-mono text-sm mb-2 tracking-[4px] uppercase">Error 404</div>
        <h1 className="font-orbitron font-black text-5xl md:text-6xl text-red-400 mb-4" style={{ textShadow: '0 0 30px rgba(239,68,68,0.4)' }}>
          Signal Lost
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed mb-8">
          The page you requested could not be located in the control network.
          Stream connection may have been interrupted.
        </p>

        <div className="glass-card p-4 mb-8 border border-red-500/20 font-mono text-sm text-left">
          <div className="text-slate-700">{`>`} Attempting route resolution...</div>
          <div className="text-red-400">{`>`} ERROR: No stream found at requested path</div>
          <div className="text-slate-700">{`>`} Initiating dead reckoning fallback...</div>
          <div className="text-amber-400">{`>`} Redirecting to Control Center</div>
        </div>

        <Link href="/">
          <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-bold text-sm tracking-wider uppercase hover:shadow-[0_0_30px_rgba(0,245,255,0.4)] transition-all">
            Return to Control Center
          </button>
        </Link>
      </div>
    </div>
  );
}
