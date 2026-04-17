export interface Machine {
  id: string;
  name: string;
  type: string;
  location: string;
}

export const MACHINES: Machine[] = [
  { id: 'CNC_01', name: 'CNC Machine 01', type: 'CNC Milling', location: 'Bay A-1' },
  { id: 'CNC_02', name: 'CNC Machine 02', type: 'CNC Lathe', location: 'Bay A-2' },
  { id: 'PUMP_03', name: 'Pump 03', type: 'Hydraulic Pump', location: 'Bay C-3' },
  { id: 'CONVEYOR_04', name: 'Conveyor 04', type: 'Material Conveyor', location: 'Line 1' },
];

export const MACHINE_BASELINES = {
  CNC_01: {
    temperature_C: { mean: 71, std: 6, min: 56, max: 86 },
    vibration_mm_s: { mean: 1.8, std: 0.45, min: 0.9, max: 3.1 },
    rpm: { mean: 1450, std: 95, min: 1180, max: 1680 },
    current_A: { mean: 12.4, std: 1.3, min: 9.2, max: 16.1 },
  },
  CNC_02: {
    temperature_C: { mean: 68, std: 7, min: 52, max: 85 },
    vibration_mm_s: { mean: 2.1, std: 0.5, min: 1.0, max: 3.5 },
    rpm: { mean: 1380, std: 90, min: 1100, max: 1600 },
    current_A: { mean: 11.8, std: 1.2, min: 8.5, max: 15 },
  },
  PUMP_03: {
    temperature_C: { mean: 76, std: 8, min: 60, max: 98 },
    vibration_mm_s: { mean: 2.6, std: 0.65, min: 1.3, max: 4.9 },
    rpm: { mean: 2820, std: 130, min: 2450, max: 3180 },
    current_A: { mean: 19.6, std: 2.1, min: 14.5, max: 26.5 },
  },
  CONVEYOR_04: {
    temperature_C: { mean: 44, std: 4, min: 34, max: 58 },
    vibration_mm_s: { mean: 1.0, std: 0.25, min: 0.4, max: 2.0 },
    rpm: { mean: 420, std: 60, min: 180, max: 640 },
    current_A: { mean: 8.4, std: 0.9, min: 6.2, max: 11.5 },
  },
};

export const PHYSICS_RULES = {
  max_temp_rate_per_sec: 5, // Max °C change per second
  max_vibration_rate_per_sec: 1.5,
  max_rpm_rate_per_sec: 200,
  max_current_rate_per_sec: 3,
  absolute_max_temp: 150,
  absolute_min_temp: -10,
};

export const ANOMALY_TYPES = {
  SPIKE: 'spike',
  DRIFT: 'drift',
  COMPOUND: 'compound',
  NOISE: 'noise',
};

export const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 80,
  CRITICAL: 90,
};

export const AGENT_NAMES = {
  SENTINEL: 'Sentinel',
  PHYSICIST: 'Physicist',
  HISTORIAN: 'Historian',
  ORCHESTRATOR: 'Orchestrator',
};

export const NAV_LINKS = [
  { label: 'Product', href: '/product' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Industries', href: '/industries' },
  { label: 'Pricing', href: '/pricing' },
];
