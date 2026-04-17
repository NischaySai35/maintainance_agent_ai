'use client';
import Link from 'next/link';
import { Activity, Globe, ExternalLink, Share2, Mail } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/[0.04] bg-[#030712] pt-16 pb-8 overflow-hidden">
      {/* Glow */}
      <div className="absolute -top-32 left-1/4 w-64 h-64 rounded-full bg-[#00d9ff]/[0.02] blur-[100px]" />

      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">

          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00d9ff] to-[#2563ff] flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(0,217,255,0.3)] transition-all">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-bold text-base text-white">
                AURA <span className="text-[#00d9ff]">SOVEREIGN</span>
              </span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              The world's first physics-validated autonomous industrial intelligence platform. Built for the next era of manufacturing.
            </p>
            <div className="flex items-center gap-2.5">
              {[Globe, ExternalLink, Share2, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center text-slate-600 hover:text-[#00d9ff] hover:border-[#00d9ff]/25 transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-5">Product</h4>
            <ul className="space-y-3">
              {[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Alerts & Anomalies', href: '/product' },
                { label: 'Scheduling', href: '/product' },
                { label: 'Analytics', href: '/product' },
              ].map(item => (
                <li key={item.label}>
                  <Link href={item.href} className="text-slate-500 text-sm hover:text-[#00d9ff] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-5">Company</h4>
            <ul className="space-y-3">
              {[
                { label: 'About', href: '/' },
                { label: 'Contact', href: '/contact' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Hackathon Entry', href: '/' },
              ].map(item => (
                <li key={item.label}>
                  <Link href={item.href} className="text-slate-500 text-sm hover:text-[#00d9ff] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Live Status Terminal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-5">System Status</h4>
            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-5 font-mono text-[11px]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#00ff99] animate-pulse" />
                <span className="text-[#00ff99] font-semibold">SYSTEM STATUS: NOMINAL</span>
              </div>
              <div className="space-y-1.5 text-slate-600">
                <div><span className="text-slate-700">{'>'}</span> Latency: <span className="text-[#00d9ff]">42ms</span></div>
                <div><span className="text-slate-700">{'>'}</span> Active Streams: <span className="text-white">4</span></div>
                <div><span className="text-slate-700">{'>'}</span> Nodes Online: <span className="text-white">1,284</span></div>
                <div><span className="text-slate-700">{'>'}</span> Uptime: <span className="text-[#00ff99]">99.998%</span></div>
                <div><span className="text-slate-700">{'>'}</span> Physics Firewall: <span className="text-[#a78bfa]">Active</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="divider-glow mb-8" />

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-slate-600 text-xs font-mono">
            © {year} Logic Weavers · All rights reserved
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-600 font-mono">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="hover:text-white transition-colors">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
