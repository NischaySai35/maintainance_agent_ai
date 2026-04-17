'use client';
import { memo, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface TrendSeries {
  temp: number[];
  vib: number[];
  rpm: number[];
  current: number[];
}

interface TrendsChartProps {
  trendSeries?: TrendSeries;
  machineId: string;
}

const METRICS = [
  { key: 'temp', label: 'Temperature', color: '#f97316', unit: '°C' },
  { key: 'vib', label: 'Vibration', color: '#a78bfa', unit: 'mm/s' },
  { key: 'rpm', label: 'RPM', color: '#06b6d4', unit: '' },
  { key: 'current', label: 'Current', color: '#38bdf8', unit: 'A' },
] as const;

const EMPTY_SERIES: TrendSeries = { temp: [], vib: [], rpm: [], current: [] };

const TrendsChart = ({ trendSeries, machineId }: TrendsChartProps) => {
  const isBrowser = typeof window !== 'undefined';
  const [visible, setVisible] = useState<Record<string, boolean>>({
    temp: true,
    vib: true,
    rpm: true,
    current: true,
  });

  const chartData = useMemo(() => {
    const source = trendSeries ?? EMPTY_SERIES;
    const maxLength = Math.max(
      source.temp.length,
      source.vib.length,
      source.rpm.length,
      source.current.length,
    );

    return Array.from({ length: maxLength }, (_, index) => ({
      idx: index,
      temp: source.temp[index] ?? null,
      vib: source.vib[index] ?? null,
      rpm: source.rpm[index] ?? null,
      current: source.current[index] ?? null,
    }));
  }, [trendSeries]);

  const toggle = (key: string) => setVisible(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {METRICS.map(metric => (
          <button
            key={metric.key}
            onClick={() => toggle(metric.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
              visible[metric.key]
                ? 'border-transparent'
                : 'border-transparent text-slate-600 opacity-40'
            }`}
            style={visible[metric.key] ? {
              background: `${metric.color}15`,
              color: metric.color,
            } : undefined}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: metric.color, opacity: visible[metric.key] ? 1 : 0.3 }} />
            {metric.label}
          </button>
        ))}
      </div>

      <div className="h-[380px]">
        {isBrowser ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
              <XAxis
                dataKey="idx"
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                tickLine={false}
              />
              {METRICS.map(metric => (
                <YAxis
                  key={metric.key}
                  yAxisId={metric.key}
                  hide
                  domain={['auto', 'auto']}
                />
              ))}
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
                  yAxisId="temp"
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
                  yAxisId="vib"
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
                  yAxisId="rpm"
                  type="monotone"
                  dataKey="rpm"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  name="RPM"
                />
              )}
              {visible.current && (
                <Line
                  yAxisId="current"
                  type="monotone"
                  dataKey="current"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  name="Current (A)"
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
