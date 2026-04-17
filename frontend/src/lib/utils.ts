import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | undefined | null, decimals = 1): string {
  if (n === undefined || n === null) return '--';
  return n.toFixed(decimals);
}

export function getRiskColor(score: number): string {
  if (score >= 90) return '#ef4444';
  if (score >= 60) return '#f59e0b';
  if (score >= 30) return '#3b82f6';
  return '#10b981';
}

export function getRiskLabel(score: number): string {
  if (score >= 90) return 'CRITICAL';
  if (score >= 60) return 'WARNING';
  if (score >= 30) return 'ELEVATED';
  return 'SAFE';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'fault': return '#ef4444';
    case 'warning': return '#f59e0b';
    case 'running': return '#10b981';
    case 'shadow': return '#6b7280';
    default: return '#10b981';
  }
}

export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function gaussianRandom(mean: number, std: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
}
