export interface Machine {
  id: string;
  name: string;
  type: string;
  location: string;
}

export const MACHINES: Machine[] = [
  { id: 'CNC_01', name: 'CNC Machine 01', type: 'CNC Milling', location: 'Bay A-1' },
  { id: 'CNC_02', name: 'CNC Machine 02', type: 'CNC Lathe', location: 'Bay A-2' },
  { id: 'LATHE_01', name: 'Lathe 01', type: 'Precision Lathe', location: 'Bay B-1' },
  { id: 'PUMP_03', name: 'Pump 03', type: 'Hydraulic Pump', location: 'Bay C-3' },
  { id: 'ROBOT_07', name: 'Assembly Robot 07', type: '6-Axis Arm', location: 'Line 2' },
  { id: 'FAN_12', name: 'Cooling Fan 12', type: 'Industrial HVAC', location: 'Roof' },
  { id: 'MOTOR_09', name: 'Main Motor 09', type: 'AC Drive', location: 'Substation' },
];

export const MACHINE_BASELINES = {
  CNC_01: {
    temperature_C: { mean: 72, std: 8, min: 55, max: 90 },
    vibration_mm_s: { mean: 1.8, std: 0.4, min: 0.8, max: 3.0 },
    rpm: { mean: 1450, std: 100, min: 1200, max: 1700 },
    current_A: { mean: 12.5, std: 1.5, min: 9, max: 16 },
  },
  CNC_02: {
    temperature_C: { mean: 68, std: 7, min: 52, max: 85 },
    vibration_mm_s: { mean: 2.1, std: 0.5, min: 1.0, max: 3.5 },
    rpm: { mean: 1380, std: 90, min: 1100, max: 1600 },
    current_A: { mean: 11.8, std: 1.2, min: 8.5, max: 15 },
  },
  LATHE_01: {
    temperature_C: { mean: 65, std: 6, min: 50, max: 80 },
    vibration_mm_s: { mean: 1.5, std: 0.35, min: 0.6, max: 2.8 },
    rpm: { mean: 1320, std: 80, min: 1000, max: 1500 },
    current_A: { mean: 10.5, std: 1.0, min: 8, max: 14 },
  },
  PUMP_03: {
    temperature_C: { mean: 58, std: 5, min: 45, max: 72 },
    vibration_mm_s: { mean: 1.2, std: 0.3, min: 0.4, max: 2.2 },
    rpm: { mean: 1200, std: 70, min: 950, max: 1400 },
    current_A: { mean: 9.2, std: 0.8, min: 7, max: 12 },
  },
  ROBOT_07: {
    temperature_C: { mean: 45, std: 4, min: 35, max: 60 },
    vibration_mm_s: { mean: 0.8, std: 0.2, min: 0.3, max: 1.5 },
    rpm: { mean: 300, std: 50, min: 50, max: 500 },
    current_A: { mean: 22.0, std: 2.5, min: 15, max: 30 },
  },
  FAN_12: {
    temperature_C: { mean: 32, std: 3, min: 20, max: 45 },
    vibration_mm_s: { mean: 3.5, std: 0.8, min: 1.5, max: 6.0 },
    rpm: { mean: 2200, std: 150, min: 1800, max: 2600 },
    current_A: { mean: 4.5, std: 0.5, min: 3, max: 7 },
  },
  MOTOR_09: {
    temperature_C: { mean: 85, std: 10, min: 65, max: 110 },
    vibration_mm_s: { mean: 0.5, std: 0.1, min: 0.2, max: 1.0 },
    rpm: { mean: 3600, std: 50, min: 3400, max: 3750 },
    current_A: { mean: 45.0, std: 4.0, min: 35, max: 55 },
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
