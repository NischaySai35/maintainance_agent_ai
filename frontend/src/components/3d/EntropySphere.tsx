'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { SensorReading } from '@/lib/mockData';

type MetricKey = 'temp' | 'vib' | 'rpm' | 'current';
type StatusLevel = 'normal' | 'warning' | 'critical';

interface MetricThreshold {
  label: string;
  unit: string;
  hardMin: number;
  hardMax: number;
  normalMax: number;
  warningMax: number;
  criticalMax: number;
  severityWeight: number;
  accent: string;
}

const METRIC_CONFIG: Record<MetricKey, MetricThreshold> = {
  temp: {
    label: 'TEMPERATURE', unit: 'degC',
    hardMin: 20, hardMax: 150,
    normalMax: 65, warningMax: 90, criticalMax: 130,
    severityWeight: 0.28,
    accent: '#f97316',
  },
  vib: {
    label: 'VIBRATION', unit: 'mm/s',
    hardMin: 0, hardMax: 12,
    normalMax: 2, warningMax: 5, criticalMax: 10,
    severityWeight: 0.24,
    accent: '#eab308',
  },
  rpm: {
    label: 'SHAFT RPM', unit: 'rpm',
    hardMin: 0, hardMax: 6000,
    normalMax: 1800, warningMax: 3000, criticalMax: 5000,
    severityWeight: 0.24,
    accent: '#a855f7',
  },
  current: {
    label: 'CURRENT', unit: 'A',
    hardMin: 0, hardMax: 250,
    normalMax: 10, warningMax: 50, criticalMax: 200,
    severityWeight: 0.24,
    accent: '#38bdf8',
  },
};

interface MetricReading {
  temp: number;
  vib: number;
  rpm: number;
  current: number;
}

interface MetricStatus {
  value: number;
  status: StatusLevel;
  norm: number;
  delta: number;
}

interface LiveState {
  temp: MetricStatus;
  vib: MetricStatus;
  rpm: MetricStatus;
  current: MetricStatus;
  severity: number;
  mode: StatusLevel;
  updatedAt: number;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t);

function deriveStatus(key: MetricKey, value: number, prev: number): MetricStatus {
  const cfg = METRIC_CONFIG[key];
  const norm = clamp((value - cfg.hardMin) / (cfg.criticalMax - cfg.hardMin));
  const status: StatusLevel =
    value > cfg.criticalMax ? 'critical' :
    value > cfg.warningMax ? 'warning' : 'normal';
  return { value, status, norm, delta: value - prev };
}

function deriveLiveState(reading: MetricReading, prev: MetricReading): LiveState {
  const temp = deriveStatus('temp', reading.temp, prev.temp);
  const vib = deriveStatus('vib', reading.vib, prev.vib);
  const rpm = deriveStatus('rpm', reading.rpm, prev.rpm);
  const current = deriveStatus('current', reading.current, prev.current);

  const severity = clamp(
    temp.norm * METRIC_CONFIG.temp.severityWeight +
    vib.norm * METRIC_CONFIG.vib.severityWeight +
    rpm.norm * METRIC_CONFIG.rpm.severityWeight +
    current.norm * METRIC_CONFIG.current.severityWeight
  );

  const mode: StatusLevel =
    severity >= 0.66 ? 'critical' :
    severity >= 0.33 ? 'warning' : 'normal';

  return { temp, vib, rpm, current, severity, mode, updatedAt: Date.now() };
}

const DEMO_BASELINE: MetricReading = {
  temp: 48,
  vib: 0.8,
  rpm: 1520,
  current: 5.2,
};

function readingFromSensor(reading: SensorReading): MetricReading {
  return {
    temp: reading.temperature_C,
    vib: reading.vibration_mm_s,
    rpm: reading.rpm,
    current: reading.current_A,
  };
}

function useLiveMetrics(externalReading?: SensorReading) {
  const [state, setState] = useState<LiveState>(() => deriveLiveState(DEMO_BASELINE, DEMO_BASELINE));
  const prevRef = useRef<MetricReading>(DEMO_BASELINE);

  useEffect(() => {
    if (!externalReading) {
      return;
    }

    const incoming = readingFromSensor(externalReading);
    setState(deriveLiveState(incoming, prevRef.current));
    prevRef.current = incoming;
  }, [externalReading]);

  useEffect(() => {
    if (externalReading) {
      return;
    }

    const sim = { ...DEMO_BASELINE };
    let prev = { ...DEMO_BASELINE };

    const DRIFT: MetricReading = { temp: 1.2, vib: 0.12, rpm: 18, current: 0.25 };
    const CENTER: MetricReading = { temp: 50, vib: 1.0, rpm: 1540, current: 5.5 };

    let eventTarget: Partial<MetricReading> = {};
    let eventTicksLeft = 0;

    const tick = () => {
      for (const k of ['temp', 'vib', 'rpm', 'current'] as MetricKey[]) {
        const drift = (Math.random() - 0.5) * 2 * DRIFT[k];
        const restore = (CENTER[k] - sim[k]) * 0.08;
        sim[k] = clamp(sim[k] + drift + restore, METRIC_CONFIG[k].hardMin, METRIC_CONFIG[k].hardMax);
      }

      if (eventTicksLeft > 0) {
        for (const k of Object.keys(eventTarget) as MetricKey[]) {
          sim[k] = lerp(sim[k], eventTarget[k] ?? sim[k], 0.35);
        }
        eventTicksLeft -= 1;
        if (eventTicksLeft === 0) {
          eventTarget = {};
        }
      } else if (Math.random() < 0.04) {
        const keys: MetricKey[] = ['temp', 'vib', 'rpm', 'current'];
        const key = keys[Math.floor(Math.random() * keys.length)];
        const cfg = METRIC_CONFIG[key];
        eventTarget = { [key]: cfg.warningMax + Math.random() * (cfg.criticalMax - cfg.warningMax) };
        eventTicksLeft = 5 + Math.floor(Math.random() * 6);
      }

      const reading: MetricReading = {
        temp: parseFloat(sim.temp.toFixed(1)),
        vib: parseFloat(sim.vib.toFixed(2)),
        rpm: Math.round(sim.rpm),
        current: parseFloat(sim.current.toFixed(2)),
      };

      setState(deriveLiveState(reading, prev));
      prev = { ...reading };
      prevRef.current = prev;
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [externalReading]);

  return state;
}

interface SphereSignals {
  nTemp: number;
  nVib: number;
  nRpm: number;
  nCurrent: number;
  severity: number;
}

function toSphereSignals(s: LiveState): SphereSignals {
  return { nTemp: s.temp.norm, nVib: s.vib.norm, nRpm: s.rpm.norm, nCurrent: s.current.norm, severity: s.severity };
}

const N = 2400;

interface Wave {
  ox: number;
  oy: number;
  oz: number;
  t: number;
  speed: number;
  amp: number;
  width: number;
  maxAge: number;
  kind: 'heartbeat' | 'rpm';
}

function makeHeartbeatWave(): Wave {
  return { ox: 0, oy: -1, oz: 0, t: 0, speed: 0.88, amp: 0.026, width: 0.18, maxAge: 3.8, kind: 'heartbeat' };
}

function makeRpmWave(): Wave {
  const a = Math.random() * Math.PI * 2;
  const l = Math.acos(2 * Math.random() - 1);
  return {
    ox: Math.sin(l) * Math.cos(a), oy: Math.cos(l), oz: Math.sin(l) * Math.sin(a),
    t: 0, speed: 0.65 + Math.random() * 0.2, amp: 0.06, width: 0.42 + Math.random() * 0.1, maxAge: 5.0, kind: 'rpm',
  };
}

function fibonacciSphere(n: number) {
  const base = new Float32Array(n * 3);
  const phases = new Float32Array(n);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i += 1) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = golden * i;
    base[i * 3] = Math.cos(t) * r;
    base[i * 3 + 1] = y;
    base[i * 3 + 2] = Math.sin(t) * r;
    phases[i] = Math.random() * Math.PI * 2;
  }
  return { base, phases };
}

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

const VERT = `
  attribute float pSize; attribute vec3 pColor; attribute float pGlow;
  varying vec3 vColor; varying float vGlow;
  void main() {
    vColor = pColor; vGlow = pGlow;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = pSize * (340.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }`;

const FRAG = `
  varying vec3 vColor; varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.1, d);
    float halo = smoothstep(0.5, 0.3, d) * 0.35 * (1.0 + vGlow * 1.2);
    gl_FragColor = vec4(vColor * (1.0 + vGlow * 0.55), core + halo);
  }`;

function DiagSphere({ signals }: { signals: SphereSignals }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigRef = useRef(signals);

  useEffect(() => {
    sigRef.current = signals;
  }, [signals]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 6.0;

    const onResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    const { base, phases } = fibonacciSphere(N);
    const pos = new Float32Array(N * 3);
    const pColor = new Float32Array(N * 3);
    const pSize = new Float32Array(N);
    const pGlow = new Float32Array(N);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('pColor', new THREE.BufferAttribute(pColor, 3));
    geo.setAttribute('pSize', new THREE.BufferAttribute(pSize, 1));
    geo.setAttribute('pGlow', new THREE.BufferAttribute(pGlow, 1));

    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
    const mesh = new THREE.Points(geo, mat);
    mesh.scale.setScalar(1.89);
    scene.add(mesh);

    const waves: Wave[] = [makeHeartbeatWave()];
    let lastHbWave = 0;
    let lastRpmWave = 0;
    const cur: SphereSignals = { ...sigRef.current };
    let raf = 0;
    let prevT = 0;

    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);
      const t = ts * 0.001;
      const dt = Math.min(t - prevT, 0.05);
      prevT = t;

      const tgt = sigRef.current;
      cur.nTemp = lerp(cur.nTemp, tgt.nTemp, dt * 1.8);
      cur.nVib = lerp(cur.nVib, tgt.nVib, dt * 2.5);
      cur.nRpm = lerp(cur.nRpm, tgt.nRpm, dt * 1.6);
      cur.nCurrent = lerp(cur.nCurrent, tgt.nCurrent, dt * 2.0);
      cur.severity = lerp(cur.severity, tgt.severity, dt * 1.2);

      if (t - lastHbWave > 2.6 - cur.severity * 0.5) {
        waves.push(makeHeartbeatWave());
        lastHbWave = t;
      }
      if (cur.nRpm > 0.25 && t - lastRpmWave > 1.8 - cur.nRpm * 0.8) {
        waves.push(makeRpmWave());
        lastRpmWave = t;
      }

      for (const w of waves) {
        w.t += dt * w.speed;
      }
      for (let i = waves.length - 1; i >= 0; i -= 1) {
        if (waves[i].t > waves[i].maxAge) {
          waves.splice(i, 1);
        }
      }

      const beatCycle = Math.max(0.6, 1.45 - cur.nRpm * 0.6);
      const p = (t % beatCycle) / beatCycle;
      const b1 = Math.exp(-Math.pow((p - 0.12) * 17, 2));
      const b2 = Math.exp(-Math.pow((p - 0.25) * 21, 2)) * 0.52;
      const heartS = 1.0 + b1 * (0.055 + cur.nCurrent * 0.025) + b2 * (0.03 + cur.nCurrent * 0.012)
        + 0.011 * Math.sin(t * 0.62) + cur.nCurrent * 0.022 * Math.sin(t * 3.1);

      mesh.rotation.y = t * (0.15 + cur.nRpm * 0.52);
      mesh.rotation.x = Math.sin(t * 0.09) * 0.11;
      mesh.position.x = 0;
      mesh.position.y = 0;

      for (let i = 0; i < N; i += 1) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        const bz = base[i * 3 + 2];
        const ph = phases[i];
        let disp = 0;
        let hbLit = 0;
        let rpmLit = 0;
        for (const w of waves) {
          const dot = clamp(bx * w.ox + by * w.oy + bz * w.oz, -1, 1);
          const diff = Math.acos(dot) - w.t;
          if (Math.abs(diff) < w.width * 2.6) {
            const d = Math.sin(diff * 8.8) * Math.exp(-Math.pow(diff / w.width, 2)) * Math.exp(-w.t * 0.48) * w.amp;
            disp += d;
            if (w.kind === 'rpm') {
              rpmLit += Math.max(0, d) * 9;
            } else {
              hbLit += Math.max(0, d) * 14;
            }
          }
        }

        const r = heartS + disp + cur.nTemp * 0.06 * smoothstep(-0.4, 1.0, by)
          + cur.nVib * 0.016 * Math.sin(t * 24 + ph * 4.2) * Math.cos(t * 19 - ph * 2.7);
        pos[i * 3] = bx * r;
        pos[i * 3 + 1] = by * r;
        pos[i * 3 + 2] = bz * r;

        const pulse = clamp((heartS - 1) * 7);
        const heat = cur.nTemp;
        const wl = hbLit + rpmLit;
        let cr = clamp(heat < 0.5 ? heat * 2 * 0.85 + 0.08 : 0.85 + (heat - 0.5) * 2 * 0.13 + pulse * 0.3 + wl * 0.35);
        let cg = clamp((1 - heat * 0.85) * 0.84 + pulse * 0.25 + wl * 0.25);
        let cb = clamp(0.08 - heat * 0.07 + wl * 0.18);
        const w2 = cur.nCurrent * 0.68;
        cr = lerp(cr, 1, w2);
        cg = lerp(cg, 1, w2);
        cb = lerp(cb, 1, w2);
        pColor[i * 3] = cr;
        pColor[i * 3 + 1] = cg;
        pColor[i * 3 + 2] = cb;
        pGlow[i] = clamp(pulse * 0.7 + hbLit * 0.22 + rpmLit * 0.15 + cur.nCurrent * 1.6 + w2 * 0.7);
        pSize[i] = 0.023 + (bz + 1) * 0.5 * 0.009 + Math.max(0, disp) * 0.55 + cur.nCurrent * 0.007;
      }

      geo.attributes.position.needsUpdate = true;
      geo.attributes.pColor.needsUpdate = true;
      geo.attributes.pSize.needsUpdate = true;
      geo.attributes.pGlow.needsUpdate = true;

      renderer.render(scene, camera);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />;
}

const STATUS_COLORS: Record<StatusLevel, { border: string; bg: string; text: string; dot: string }> = {
  normal: { border: '#34d36866', bg: '#10b98112', text: '#4ade80', dot: '#4ade80' },
  warning: { border: '#f59e0b88', bg: '#f59e0b12', text: '#fbbf24', dot: '#fbbf24' },
  critical: { border: '#f43f5e88', bg: '#f43f5e14', text: '#fb7185', dot: '#fb7185' },
};

function MetricCard({ metricKey, ms }: { metricKey: MetricKey; ms: MetricStatus }) {
  const cfg = METRIC_CONFIG[metricKey];
  const sc = STATUS_COLORS[ms.status];
  const isAlert = ms.status !== 'normal';
  const arrow = ms.delta > 0.05 ? 'UP' : ms.delta < -0.05 ? 'DOWN' : 'FLAT';
  const arrowColor = isAlert ? sc.text : 'rgba(100,116,139,0.8)';

  const fmt = metricKey === 'rpm'
    ? ms.value.toFixed(0)
    : metricKey === 'vib' || metricKey === 'current'
      ? ms.value.toFixed(2)
      : ms.value.toFixed(1);

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${isAlert ? sc.border : 'rgba(255,255,255,0.1)'}`,
      background: isAlert ? sc.bg : 'rgba(5,10,25,0.72)',
      backdropFilter: 'blur(14px)',
      padding: '14px 18px',
      transition: 'border-color 0.5s, background 0.5s',
      width: 200,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 9, letterSpacing: '0.28em', fontWeight: 600,
          color: isAlert ? sc.text : 'rgba(148,163,184,0.9)',
        }}>
          {cfg.label}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: sc.dot, flexShrink: 0,
            animation: ms.status === 'critical' ? 'blink 0.8s infinite' : 'none',
          }} />
          <span style={{ fontSize: 8, letterSpacing: '0.2em', color: sc.text }}>
            {ms.status.toUpperCase()}
          </span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 8 }}>
        <span style={{
          fontSize: 26, fontWeight: 700, lineHeight: 1,
          color: isAlert ? sc.text : '#e2e8f0', transition: 'color 0.4s',
        }}>
          {fmt}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', letterSpacing: '0.06em' }}>
          {cfg.unit}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: arrowColor }}>
          {arrow}
        </span>
      </div>

      <div style={{ marginTop: 9, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          borderRadius: 2,
          width: `${clamp(ms.norm) * 100}%`,
          background: ms.status === 'critical' ? '#f43f5e'
            : ms.status === 'warning' ? '#f59e0b'
              : cfg.accent,
          transition: 'width 0.8s ease, background 0.5s',
        }} />
      </div>
    </div>
  );
}

interface EntropySphereProps {
  reading?: SensorReading;
}

export default function EntropySphere({ reading }: EntropySphereProps) {
  const live = useLiveMetrics(reading);
  const signals = useMemo(() => toSphereSignals(live), [live]);
  const ms = STATUS_COLORS[live.mode];

  const [secAgo, setSecAgo] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecAgo(Math.round((Date.now() - live.updatedAt) / 1000)), 500);
    return () => clearInterval(id);
  }, [live.updatedAt]);

  const sevPct = (live.severity * 100).toFixed(0);

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', minHeight: 300,
      background: '#030712', color: '#f1f5f9', overflow: 'hidden',
      fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
      borderRadius: 14,
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: [
          'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(16,185,129,0.04) 0%, transparent 70%)',
          'radial-gradient(ellipse 40% 60% at 20% 20%, rgba(99,102,241,0.05) 0%, transparent 55%)',
          'radial-gradient(ellipse 50% 40% at 80% 80%, rgba(244,63,94,0.04) 0%, transparent 55%)',
        ].join(','),
      }} />

      <div style={{ position: 'absolute', inset: 0, transform: 'translate(6%, -10%)' }}>
        <DiagSphere signals={signals} />
      </div>

      <div style={{ position: 'absolute', inset: 0, zIndex: 20, padding: 20 }}>
        <div style={{
          position: 'absolute', left: 20, top: 20,
          display: 'flex', flexDirection: 'column', gap: 14,
          width: 'min(230px, 28%)',
        }}>
          <MetricCard metricKey="temp" ms={live.temp} />
          <MetricCard metricKey="vib" ms={live.vib} />
          <MetricCard metricKey="rpm" ms={live.rpm} />
          <MetricCard metricKey="current" ms={live.current} />
        </div>

        <div style={{
          position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 12, zIndex: 20,
        }}>
          <div style={{
            borderRadius: 14, border: `1px solid ${ms.border}`,
            background: ms.bg, backdropFilter: 'blur(16px)',
            padding: '14px 16px', textAlign: 'center', minWidth: 120, transition: 'all 0.6s',
          }}>
            <div style={{ fontSize: 8, letterSpacing: '0.22em', color: ms.text, opacity: 0.7 }}>SYSTEM MODE</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 9 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: ms.dot, boxShadow: `0 0 8px ${ms.dot}` }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: ms.text, letterSpacing: '0.08em' }}>
                {live.mode.toUpperCase()}
              </span>
            </div>
          </div>

          <div style={{
            borderRadius: 14, border: '1px solid rgba(255,255,255,0.09)',
            background: 'rgba(5,10,25,0.72)', backdropFilter: 'blur(14px)',
            padding: '12px 14px', minWidth: 120,
          }}>
            <div style={{ fontSize: 8, letterSpacing: '0.22em', color: 'rgba(148,163,184,0.7)', marginBottom: 10 }}>
              SEVERITY
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 56, borderRadius: 3, background: 'rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: `${sevPct}%`,
                  background: live.severity > 0.66 ? '#f43f5e' : live.severity > 0.33 ? '#f59e0b' : '#34d368',
                  borderRadius: 3, transition: 'height 0.8s ease, background 0.6s ease',
                }} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: ms.text, lineHeight: 1 }}>{sevPct}</div>
                <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.6)', marginTop: 3 }}>%</div>
              </div>
            </div>
          </div>

          <div style={{
            borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(5,10,25,0.72)', backdropFilter: 'blur(14px)',
            padding: '10px 14px', textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d368', animation: 'blink 1.4s infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(148,163,184,0.7)' }}>LIVE</span>
            </div>
            <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.4)', marginTop: 4 }}>
              {secAgo}s ago
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}