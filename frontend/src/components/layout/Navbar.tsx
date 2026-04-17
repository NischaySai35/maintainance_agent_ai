'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Activity, ArrowRight } from 'lucide-react';

const links = [
  { href: '/product', label: 'Product' },
  { href: '/industries', label: 'Industries' },
  { href: '/pricing', label: 'Pricing' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-[#030712]/80 backdrop-blur-2xl border-b border-white/[0.06] py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="container-custom flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00d9ff] to-[#2563ff] flex items-center justify-center group-hover:shadow-[0_0_24px_rgba(0,217,255,0.5)] transition-all duration-300">
              <Activity className="w-5 h-5 text-white" />
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#00d9ff] to-[#2563ff] opacity-0 group-hover:opacity-30 animate-ping" style={{ animationDuration: '2s' }} />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight text-white">
            AURA <span className="text-[#00d9ff]">SOVEREIGN</span>
          </span>
        </Link>

        {/* Desktop Links & Status */}
        <div className="hidden lg:flex items-center gap-8">
          <div className="flex items-center gap-2">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3 py-1 text-sm font-medium transition-colors group"
              >
                <span className={pathname === link.href ? 'text-white' : 'text-slate-500 group-hover:text-white'}>
                  {link.label}
                </span>
                {/* Active underline */}
                <motion.span
                  className="absolute bottom-[-10px] left-0 h-[2px] bg-[#00d9ff] rounded-full"
                  initial={false}
                  animate={{
                    width: pathname === link.href ? '100%' : '0%',
                  }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            ))}
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* System Status Badge */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff99] shadow-[0_0_8px_rgba(0,255,153,0.5)] animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-[#00ff99] tracking-widest uppercase">
              System: Operational
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-4">
          <Link href="/dashboard">
            <button className="btn-primary flex items-center gap-2 px-5 py-2 text-xs group uppercase tracking-widest font-bold">
              Launch Console
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#030712]/95 backdrop-blur-xl border-b border-white/5 overflow-hidden"
          >
            <div className="container-custom py-8 flex flex-col gap-4">
              {links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-base font-medium py-2 ${pathname === link.href ? 'text-[#00d9ff]' : 'text-slate-400'}`}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-white/5 my-2" />
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="btn-primary w-full py-3.5 text-sm">
                  Launch Console
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
