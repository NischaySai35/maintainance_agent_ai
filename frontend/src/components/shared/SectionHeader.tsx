'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  label?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export default function SectionHeader({ label, title, subtitle, centered = true, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-16', centered && 'text-center', className)}>
      {label && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-400 text-xs font-orbitron tracking-[2px] uppercase">{label}</span>
        </motion.div>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="text-4xl md:text-5xl font-orbitron font-bold gradient-text-cyan mb-4 leading-tight"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
