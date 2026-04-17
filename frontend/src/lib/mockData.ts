import { MACHINE_BASELINES, MACHINES, PHYSICS_RULES } from './constants';
import { gaussianRandom, clamp } from './utils';

export interface SensorReading {
  machine_id: string;
  timestamp: string;
  temperature_C: number;
  vibration_mm_s: number;
  rpm: number;
  current_A: number;
  status: 'running' | 'warning' | 'fault' | 'shadow';
  riskScore: number;
  anomalyType?: string;
  predicted?: boolean;
  physicsBlocked?: boolean;
  blockReason?: string;
}

export interface AlertEntry {
  id: string;
  timestamp: string;
  machine_id: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  action: string;
  type: 'verified' | 'suppressed';
  reason?: string;
  physicsRule?: string;
  riskScore: number;
}

const machineState: Record<string, SensorReading> = {};

// Initialize machine states
MACHINES.forEach(m => {
  const b = MACHINE_BASELINES[m.id as keyof typeof MACHINE_BASELINES];
  if (b) {
    machineState[m.id] = {
      machine_id: m.id,
      timestamp: new Date().toISOString(),
      temperature_C: b.temperature_C.mean,
      vibration_mm_s: b.vibration_mm_s.mean,
      rpm: b.rpm.mean,
      current_A: b.current_A.mean,
      status: 'running',
      riskScore: 5,
    };
  }
});

function computeRiskScore(reading: Partial<SensorReading>, machineId: string): number {
  const b = MACHINE_BASELINES[machineId as keyof typeof MACHINE_BASELINES];
  if (!b) return 0;

  const tempDev = Math.abs((reading.temperature_C! - b.temperature_C.mean) / b.temperature_C.std);
  const vibDev = Math.abs((reading.vibration_mm_s! - b.vibration_mm_s.mean) / b.vibration_mm_s.std);
  const rpmDev = Math.abs((reading.rpm! - b.rpm.mean) / b.rpm.std);
  const curDev = Math.abs((reading.current_A! - b.current_A.mean) / b.current_A.std);

  const maxDev = Math.max(tempDev, vibDev, rpmDev, curDev);
  const avgDev = (tempDev + vibDev + rpmDev + curDev) / 4;

  let score = (maxDev * 15 + avgDev * 10);
  score = clamp(score, 0, 100);
  return Math.round(score);
}

export function generateNextReading(machineId: string, injectSpike = false, shadowMode = false): SensorReading {
  if (shadowMode) {
    const prev = machineState[machineId];
    return {
      ...prev,
      timestamp: new Date().toISOString(),
      status: 'shadow',
      riskScore: prev.riskScore,
    };
  }

  const b = MACHINE_BASELINES[machineId as keyof typeof MACHINE_BASELINES];
  const prev = machineState[machineId];

  if (injectSpike) {
    // Physics violation — should be blocked
    return {
      machine_id: machineId,
      timestamp: new Date().toISOString(),
      temperature_C: 999,
      vibration_mm_s: prev.vibration_mm_s,
      rpm: prev.rpm,
      current_A: prev.current_A,
      status: 'warning',
      riskScore: prev.riskScore,
      physicsBlocked: true,
      blockReason: 'Thermal Inertia Exceeded: ΔT/s > 5°C/s physical limit',
      anomalyType: 'spike',
    };
  }

  // Small random walk from previous
  const drift = Math.random() < 0.02; // 2% chance of drift event
  const compound = Math.random() < 0.01; // 1% chance of compound

  const tempDelta = clamp(gaussianRandom(0, 0.8), -PHYSICS_RULES.max_temp_rate_per_sec, PHYSICS_RULES.max_temp_rate_per_sec);
  const vibDelta = clamp(gaussianRandom(0, 0.1), -PHYSICS_RULES.max_vibration_rate_per_sec, PHYSICS_RULES.max_vibration_rate_per_sec);
  const rpmDelta = clamp(gaussianRandom(0, 15), -PHYSICS_RULES.max_rpm_rate_per_sec, PHYSICS_RULES.max_rpm_rate_per_sec);
  const curDelta = clamp(gaussianRandom(0, 0.2), -PHYSICS_RULES.max_current_rate_per_sec, PHYSICS_RULES.max_current_rate_per_sec);

  const newTemp = clamp(prev.temperature_C + tempDelta + (drift ? 2 : 0), b.temperature_C.min - 5, b.temperature_C.max + 10);
  const newVib = clamp(prev.vibration_mm_s + vibDelta + (compound ? 0.5 : 0), b.vibration_mm_s.min, b.vibration_mm_s.max + 1.5);
  const newRpm = clamp(prev.rpm + rpmDelta, b.rpm.min - 50, b.rpm.max + 50);
  const newCur = clamp(prev.current_A + curDelta + (compound ? 1 : 0), b.current_A.min, b.current_A.max + 2);

  const reading: SensorReading = {
    machine_id: machineId,
    timestamp: new Date().toISOString(),
    temperature_C: parseFloat(newTemp.toFixed(1)),
    vibration_mm_s: parseFloat(newVib.toFixed(2)),
    rpm: Math.round(newRpm),
    current_A: parseFloat(newCur.toFixed(1)),
    status: 'running',
    riskScore: 0,
    anomalyType: compound ? 'compound' : drift ? 'drift' : undefined,
  };

  reading.riskScore = computeRiskScore(reading, machineId);
  if (reading.riskScore >= 90) reading.status = 'fault';
  else if (reading.riskScore >= 60) reading.status = 'warning';

  machineState[machineId] = reading;
  return reading;
}

export function generate7DayHistory(machineId: string): SensorReading[] {
  const b = MACHINE_BASELINES[machineId as keyof typeof MACHINE_BASELINES];
  const history: SensorReading[] = [];
  const now = Date.now();
  const points = 7 * 24 * 60; // one per minute for 7 days

  let temp = b.temperature_C.mean;
  let vib = b.vibration_mm_s.mean;
  let rpm = b.rpm.mean;
  let cur = b.current_A.mean;

  for (let i = points; i >= 0; i--) {
    temp = clamp(temp + gaussianRandom(0, 0.3), b.temperature_C.min, b.temperature_C.max);
    vib = clamp(vib + gaussianRandom(0, 0.05), b.vibration_mm_s.min, b.vibration_mm_s.max);
    rpm = clamp(rpm + gaussianRandom(0, 10), b.rpm.min, b.rpm.max);
    cur = clamp(cur + gaussianRandom(0, 0.1), b.current_A.min, b.current_A.max);

    history.push({
      machine_id: machineId,
      timestamp: new Date(now - i * 60 * 1000).toISOString(),
      temperature_C: parseFloat(temp.toFixed(1)),
      vibration_mm_s: parseFloat(vib.toFixed(2)),
      rpm: Math.round(rpm),
      current_A: parseFloat(cur.toFixed(1)),
      status: 'running',
      riskScore: 5,
    });
  }
  return history;
}

export function generateInitialAlerts(): AlertEntry[] {
  const now = Date.now();
  return [
    {
      id: '1',
      timestamp: new Date(now - 3600000).toISOString(),
      machine_id: 'CNC_01',
      issue: 'Sustained bearing vibration drift (+2.3σ over 14min)',
      severity: 'warning',
      action: 'Maintenance scheduled — Slot 09:00 tomorrow',
      type: 'verified',
      riskScore: 72,
    },
    {
      id: '2',
      timestamp: new Date(now - 7200000).toISOString(),
      machine_id: 'PUMP_03',
      issue: 'Motor current overload — compound thermal + current anomaly',
      severity: 'critical',
      action: 'Emergency shutdown initiated. Engineer dispatched.',
      type: 'verified',
      riskScore: 91,
    },
    {
      id: '3',
      timestamp: new Date(now - 1800000).toISOString(),
      machine_id: 'CNC_02',
      issue: 'Transient temperature spike — 999°C reading',
      severity: 'info',
      action: 'Blocked by Physics Firewall — no action required',
      type: 'suppressed',
      reason: 'Thermal Inertia Violation',
      physicsRule: 'ΔT/s > 5°C/s physical limit exceeded',
      riskScore: 0,
    },
    {
      id: '4',
      timestamp: new Date(now - 900000).toISOString(),
      machine_id: 'CONVEYOR_04',
      issue: 'Single-cycle RPM spike — 920 RPM',
      severity: 'info',
      action: 'Blocked — transient noise, no persistence detected',
      type: 'suppressed',
      reason: 'No persistence (< 3 readings)',
      physicsRule: 'Transient spike suppression rule',
      riskScore: 0,
    },
  ];
}

export function generateAgentMessages(): { agent: string; message: string; time: string }[] {
  const msgs = [
    { agent: 'Sentinel', message: 'Initiating continuous monitoring across 4 machine streams...' },
    { agent: 'Physicist', message: 'Physical constraint validation engine — active.' },
    { agent: 'Historian', message: 'Baseline models loaded: 7-day historical corpus per machine.' },
    { agent: 'Orchestrator', message: 'All agents synchronized. System operational.' },
    { agent: 'System', message: '--- Stream connected: CNC_01, CNC_02, PUMP_03, CONVEYOR_04 ---' },
    { agent: 'Sentinel', message: 'CNC_01 → Normal range. Temp: 72.3°C | Vib: 1.82 mm/s' },
    { agent: 'Sentinel', message: 'PUMP_03 → Slight vibration elevation detected: 1.9σ above mean.' },
    { agent: 'Physicist', message: 'PUMP_03 vibration rate: 0.08 mm/s per tick — within inertial limits.' },
    { agent: 'Historian', message: 'PUMP_03 pattern matches prior Q2 bearing wear signature (87% confidence).' },
    { agent: 'Orchestrator', message: 'PUMP_03 risk elevated to 61. Scheduling inspection in 48hr window.' },
    { agent: 'Sentinel', message: 'CNC_02 → Thermal drift detected: +3.2°C over 12 readings.' },
    { agent: 'Physicist', message: 'Drift rate: 0.27°C/s — thermodynamically valid transition.' },
    { agent: 'Historian', message: 'CNC_02 coolant flush due: 18 days since last service (pattern match 91%).' },
    { agent: 'Orchestrator', message: 'CNC_02 alert raised. Maintenance slot proposed: tomorrow 14:00.' },
    { agent: 'System', message: '--- Physics Firewall: 3 spikes suppressed this session ---' },
  ];
  const now = Date.now();
  return msgs.map((m, i) => ({
    ...m,
    time: new Date(now - (msgs.length - i) * 45000).toISOString(),
  }));
}
