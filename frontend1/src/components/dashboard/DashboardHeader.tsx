'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Bell, ChevronRight, User } from 'lucide-react';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/product', label: 'Product' },
  { href: '/industries', label: 'Industries' },
  { href: '/pricing', label: 'Pricing' },
];

interface DashboardHeaderProps {
  alertCount?: number;
}

export default function DashboardHeader({ alertCount = 0 }: DashboardHeaderProps) {
  const pathname = usePathname();
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/[0.06]">
      <div className="flex items-center h-14 px-6 gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-white tracking-tight">
            AURA <span className="text-cyan-400">SOVEREIGN</span>
          </span>
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10 hidden md:block" />

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                pathname === link.href
                  ? 'text-white bg-white/[0.08]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Section */}
        <div className="ml-auto flex items-center gap-3">
          {/* System Status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[11px] font-medium">All Systems Live</span>
          </div>

          {/* Live Clock */}
          <span className="hidden lg:block font-mono text-[11px] text-slate-500">{time}</span>

          {/* Alerts */}
          <button className="relative p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
            <Bell className="w-4 h-4 text-slate-400" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {/* User Avatar */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Launch Console (visible on landing, acts as brand on dashboard) */}
          <Link
            href="/dashboard"
            className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors"
          >
            Console <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </header>
  );
}
