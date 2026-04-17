'use client';
import { memo, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface TrendsChartProps {
  sparklineData: number[];
  machineId: string;
}

const METRICS = [
  { key: 'temp', label: 'Temperature', color: '#f97316', unit: '°C' },
  { key: 'vib', label: 'Vibration', color: '#a78bfa', unit: 'mm/s' },
  { key: 'rpm', label: 'RPM', color: '#06b6d4', unit: '' },
] as const;

const TrendsChart = ({ sparklineData, machineId }: TrendsChartProps) => {
  const isBrowser = typeof window !== 'undefined';
  const [visible, setVisible] = useState<Record<string, boolean>>({
    temp: true,
    vib: true,
    rpm: false,
  });

  // Generate fake correlated data from sparkline (temperature)
  const chartData = useMemo(() => {
    const noise = (index: number, seed: number) => {
      const value = Math.sin(index * 12.9898 + seed) * 43758.5453;
      return (value - Math.floor(value)) - 0.5;
    };

    return sparklineData.map((temp, i) => ({
      idx: i,
      temp: temp,
      vib: Math.max(0.3, temp * 0.028 + noise(i, 3.1) * 0.3),
      rpm: 1200 + Math.sin(i * 0.3) * 100 + noise(i, 9.7) * 50,
    }));
  }, [sparklineData]);

  const toggle = (key: string) =>
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div>
      {/* Metric toggles */}
      <div className="flex items-center gap-2 mb-4">
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => toggle(m.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
              visible[m.key]
                ? 'border-transparent'
                : 'border-transparent text-slate-600 opacity-40'
            }`}
            style={visible[m.key] ? {
              background: `${m.color}15`,
              color: m.color,
            } : undefined}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: m.color, opacity: visible[m.key] ? 1 : 0.3 }} />
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[380px]">
        {isBrowser ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
              <XAxis
                dataKey="idx"
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#f8fafc',
                }}
                labelFormatter={() => machineId}
              />
              {visible.temp && (
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  name="Temp (°C)"
                />
              )}
              {visible.vib && (
                <Line
                  type="monotone"
                  dataKey="vib"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  name="Vibration (mm/s)"
                />
              )}
              {visible.rpm && (
                <Line
                  type="monotone"
                  dataKey="rpm"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  name="RPM"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default memo(TrendsChart);
