'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'purple' | 'success' | 'warning' | 'critical';
  hover?: boolean;
  glow?: boolean;
}

const variantClasses = {
  default: 'glass-card',
  purple: 'glass-card-purple',
  success: 'border border-green-500/20 bg-green-500/5 backdrop-blur-lg rounded-2xl',
  warning: 'border border-amber-500/20 bg-amber-500/5 backdrop-blur-lg rounded-2xl',
  critical: 'border border-red-500/20 bg-red-500/5 backdrop-blur-lg rounded-2xl',
};

export default function GlassCard({ children, className, variant = 'default', hover = false, glow = false }: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        variantClasses[variant],
        hover && 'card-hover cursor-pointer',
        glow && 'glow-cyan',
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}
