'use client';
import { memo, useMemo } from 'react';
import type { SensorReading } from '@/lib/mockData';

interface DiagnosticsPanelProps {
  reading: SensorReading | undefined;
}

interface DiagnosticItem {
  label: string;
  value: number; // 0-100
  color: string;
}

const DiagnosticsPanel = ({ reading }: DiagnosticsPanelProps) => {
  const items: DiagnosticItem[] = useMemo(() => {
    if (!reading) {
      return [
        { label: 'Bearing Wear', value: 0, color: '#94a3b8' },
        { label: 'Thermal Drift', value: 0, color: '#94a3b8' },
        { label: 'Lubrication Health', value: 0, color: '#94a3b8' },
        { label: 'Power Quality', value: 0, color: '#94a3b8' },
      ];
    }

    const risk = reading.riskScore;
    const bearingWear = Math.min(100, reading.vibration_mm_s * 25 + risk * 0.3);
    const thermalDrift = Math.min(100, Math.max(0, (reading.temperature_C - 50) * 1.2));
    const lubricationHealth = Math.max(0, 100 - bearingWear * 0.8);
    const powerQuality = Math.max(0, 100 - Math.abs(reading.current_A - 12) * 5);

    return [
      {
        label: 'Bearing Wear Probability',
        value: Math.round(bearingWear),
        color: bearingWear > 70 ? '#ef4444' : bearingWear > 40 ? '#f59e0b' : '#10b981',
      },
      {
        label: 'Thermal Drift',
        value: Math.round(thermalDrift),
        color: thermalDrift > 70 ? '#ef4444' : thermalDrift > 40 ? '#f59e0b' : '#10b981',
      },
      {
        label: 'Lubrication Health',
        value: Math.round(lubricationHealth),
        color: lubricationHealth < 30 ? '#ef4444' : lubricationHealth < 60 ? '#f59e0b' : '#10b981',
      },
      {
        label: 'Power Quality',
        value: Math.round(Math.max(0, powerQuality)),
        color: powerQuality < 30 ? '#ef4444' : powerQuality < 60 ? '#f59e0b' : '#10b981',
      },
    ];
  }, [reading]);

  return (
    <div className="space-y-5">
      {items.map(item => (
        <div key={item.label}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300">{item.label}</span>
            <span className="text-sm font-semibold tabular-nums" style={{ color: item.color }}>
              {item.value}%
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${item.value}%`, background: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(DiagnosticsPanel);
