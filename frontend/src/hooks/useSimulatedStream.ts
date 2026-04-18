'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateAgentMessages,
  generateInitialAlerts,
  generateNextReading,
  type AlertEntry,
  type SensorReading,
} from '@/lib/mockData';
import { MACHINES } from '@/lib/constants';

interface StreamState {
  readings: Record<string, SensorReading>;
  sparklines: Record<string, number[]>;
  trendSeries: Record<string, TrendSeries>;
  alerts: AlertEntry[];
  agentMessages: { agent: string; message: string; time: string }[];
  shadowMachines: Set<string>;
  chaosMachineId: string | null;
  surgeDetected: boolean;
  syntheticMode: boolean;
  lastAlertId: number;
}

interface BackendMachineSnapshot {
  machine_id: string;
  timestamp?: string;
  temperature_C?: number;
  vibration_mm_s?: number;
  rpm?: number;
  current_A?: number;
  status?: string;
  regime?: string;
  predicted?: boolean;
  piv_accepted?: boolean;
  piv_reason?: string;
  anomaly_types?: string[];
  z_scores?: Record<string, number>;
  cusum_values?: Record<string, number>;
  risk_score?: number;
  explanation?: string;
  reasoning?: Record<string, string>;
}

interface BackendStateResponse {
  timestamp?: string;
  machines?: Record<string, BackendMachineSnapshot>;
  alerts?: Array<Record<string, unknown>>;
  maintenance_events?: Array<Record<string, unknown>>;
}

interface TrendSeries {
  temp: number[];
  vib: number[];
  rpm: number[];
  current: number[];
}

function makeEmptyTrendSeries(): TrendSeries {
  return { temp: [], vib: [], rpm: [], current: [] };
}

function appendTrendSeries(existing: TrendSeries | undefined, reading: SensorReading): TrendSeries {
  const base = existing ?? makeEmptyTrendSeries();
  return {
    temp: [...base.temp.slice(-19), reading.temperature_C],
    vib: [...base.vib.slice(-19), reading.vibration_mm_s],
    rpm: [...base.rpm.slice(-19), reading.rpm],
    current: [...base.current.slice(-19), reading.current_A],
  };
}

const BACKEND_HTTP_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

function toWebSocketUrl(httpUrl: string): string {
  const url = new URL('/ws', httpUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

function toStatus(
  rawStatus: string | undefined,
  isShadow: boolean,
  riskScore: number,
): SensorReading['status'] {
  if (isShadow) return 'shadow';
  if (riskScore >= 90) return 'fault';
  if (riskScore >= 60) return 'warning';
  if (rawStatus === 'fault' || rawStatus === 'warning' || rawStatus === 'running' || rawStatus === 'shadow') {
    return rawStatus === 'shadow' ? 'running' : rawStatus;
  }
  return 'running';
}

function mapReading(
  snapshot: BackendMachineSnapshot,
  shadowMachines: Set<string>,
  chaosMachineId: string | null,
): SensorReading {
  const baseRisk = Number(snapshot.risk_score ?? 0);
  const isShadow = shadowMachines.has(snapshot.machine_id);
  const isChaos = chaosMachineId === snapshot.machine_id;
  const riskScore = isChaos ? Math.min(100, baseRisk + 30) : baseRisk;

  return {
    machine_id: snapshot.machine_id,
    timestamp: snapshot.timestamp ?? new Date().toISOString(),
    temperature_C: Number(snapshot.temperature_C ?? 0),
    vibration_mm_s: Number(snapshot.vibration_mm_s ?? 0),
    rpm: Number(snapshot.rpm ?? 0),
    current_A: Number(snapshot.current_A ?? 0),
    status: toStatus(snapshot.status, isShadow, riskScore),
    riskScore,
    anomalyType: isChaos ? 'chaos' : snapshot.anomaly_types?.[0],
    predicted: Boolean(snapshot.predicted),
  };
}

function mapAlert(
  event: Record<string, unknown>,
  source: 'alert' | 'maintenance',
  index: number,
): AlertEntry {
  const timestamp = typeof event.timestamp === 'string' ? event.timestamp : new Date().toISOString();
  const machineId = typeof event.machine_id === 'string' ? event.machine_id : 'UNKNOWN';
  const riskScore = Number(event.risk_score ?? event.riskScore ?? 0);
  const reason = typeof event.reason === 'string' ? event.reason : undefined;
  const severity = source === 'maintenance'
    ? (riskScore >= 85 ? 'critical' : 'warning')
    : riskScore >= 85
      ? 'critical'
      : riskScore >= 60
        ? 'warning'
        : 'info';

  return {
    id: `${source}-${typeof event.id === 'string' ? event.id : `${machineId}-${timestamp}-${index}`}`,
    timestamp,
    machine_id: machineId,
    issue: source === 'maintenance'
      ? `${machineId} maintenance scheduled`
      : reason ?? `${machineId} alert logged`,
    severity,
    action: source === 'maintenance'
      ? 'Priority maintenance queued'
      : riskScore >= 70
        ? 'Inspection flagged in queue'
        : 'Alert recorded',
    type: 'verified',
    reason,
    riskScore,
  };
}

function formatAgentMessage(agent: string, message: string) {
  return { agent, message, time: new Date().toISOString() };
}

function formatAgentName(agent: string): string {
  return agent.charAt(0).toUpperCase() + agent.slice(1);
}

export function useSimulatedStream() {
  const [state, setState] = useState<StreamState>({
    readings: {},
    sparklines: {},
    trendSeries: {},
    alerts: generateInitialAlerts(),
    agentMessages: generateAgentMessages(),
    shadowMachines: new Set(),
    chaosMachineId: null,
    surgeDetected: false,
    syntheticMode: false,
    lastAlertId: 10,
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syntheticConsoleRef = useRef<number>(0);

  const updateReading = useCallback((snapshot: BackendMachineSnapshot) => {
    setState(prev => {
      const reading = mapReading(snapshot, prev.shadowMachines, prev.chaosMachineId);
      const readings = { ...prev.readings, [snapshot.machine_id]: reading };
      const sparklines = { ...prev.sparklines };
      const existingSparkline = sparklines[snapshot.machine_id] ?? [];
      sparklines[snapshot.machine_id] = [...existingSparkline.slice(-19), reading.temperature_C];
      const trendSeries = { ...prev.trendSeries };
      trendSeries[snapshot.machine_id] = appendTrendSeries(trendSeries[snapshot.machine_id], reading);

      const alerts = [...prev.alerts];
      if (!reading.physicsBlocked && reading.riskScore >= 75 && reading.status !== 'shadow') {
        const recentlyAlerted = alerts.find(
          alert =>
            alert.machine_id === snapshot.machine_id &&
            alert.type === 'verified' &&
            Date.now() - new Date(alert.timestamp).getTime() < 30000,
        );

        if (!recentlyAlerted) {
          alerts.unshift({
            id: `live-${snapshot.machine_id}-${Date.now()}`,
            timestamp: reading.timestamp,
            machine_id: snapshot.machine_id,
            issue: `${snapshot.machine_id} ${reading.riskScore >= 90 ? 'critical' : 'elevated'} risk detected`,
            severity: reading.riskScore >= 90 ? 'critical' : 'warning',
            action: reading.riskScore >= 90 ? 'Emergency maintenance scheduled' : 'Inspection flagged in queue',
            type: 'verified',
            riskScore: reading.riskScore,
          });
        }
      }

      const agentMessages = [...prev.agentMessages];
      const reasoningEntries = Object.entries(snapshot.reasoning ?? {});

      if (reasoningEntries.length > 0) {
        for (const [agent, message] of reasoningEntries) {
          agentMessages.push(formatAgentMessage(formatAgentName(agent), message));
        }
      } else {
        agentMessages.push(
          formatAgentMessage(
            'Sentinel',
            `${snapshot.machine_id} -> ${Math.round(reading.riskScore)}% risk, ${reading.status}${snapshot.predicted ? ' (predicted)' : ''}`,
          ),
        );
      }

      const surgeDetected = Object.values(readings).filter(item => item.riskScore >= 85).length >= 3;
      const chaosMachineId = prev.chaosMachineId === snapshot.machine_id ? null : prev.chaosMachineId;

      return {
        ...prev,
        readings,
        sparklines,
        trendSeries,
        alerts: alerts.slice(0, 50),
        agentMessages: agentMessages.slice(-60),
        chaosMachineId,
        surgeDetected,
      };
    });
  }, []);

  const seedFromBackend = useCallback((payload: BackendStateResponse) => {
    setState(prev => {
      const machineSnapshots = payload.machines ?? {};
      const readings: Record<string, SensorReading> = {};
      const sparklines: Record<string, number[]> = {};
      const trendSeries: Record<string, TrendSeries> = {};
      const snapshots = Object.values(machineSnapshots);
      const syntheticMode = snapshots.length > 0 && snapshots.every(snapshot => Boolean(snapshot.predicted));

      for (const [machineId, snapshot] of Object.entries(machineSnapshots)) {
        const reading = mapReading(snapshot, prev.shadowMachines, prev.chaosMachineId);
        readings[machineId] = reading;
        sparklines[machineId] = [reading.temperature_C];
        trendSeries[machineId] = appendTrendSeries(undefined, reading);
      }

      const alerts = [
        ...(payload.alerts ?? []).map((event, index) => mapAlert(event, 'alert', index)),
        ...(payload.maintenance_events ?? []).map((event, index) => mapAlert(event, 'maintenance', index)),
      ].sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));

      const machineCount = Object.keys(machineSnapshots).length;
      const liveMessages = [
        ...generateAgentMessages(),
        formatAgentMessage('System', `Connected to backend telemetry at ${BACKEND_HTTP_URL}`),
        formatAgentMessage('Sentinel', `Loaded ${machineCount} live machine snapshots from /state`),
        formatAgentMessage('Physicist', `Physical checks armed for ${machineCount} machines`),
        formatAgentMessage('Historian', `Historical baselines aligned for ${machineCount} machines`),
        formatAgentMessage('Orchestrator', `Active alerts: ${alerts.length}`),
      ];

      return {
        ...prev,
        readings,
        sparklines,
        trendSeries,
        alerts: alerts.length > 0 ? alerts.slice(0, 50) : prev.alerts,
        agentMessages: liveMessages,
        surgeDetected: Object.values(readings).filter(item => item.riskScore >= 85).length >= 3,
        syntheticMode,
      };
    });
  }, []);

  const applyWsEvent = useCallback((payload: Record<string, unknown>) => {
    const eventType = typeof payload.event === 'string' ? payload.event : '';

    if (eventType === 'machine_update') {
      const readingSource = payload.reading && typeof payload.reading === 'object'
        ? payload.reading as Record<string, unknown>
        : payload;
      const machineId = typeof payload.machine_id === 'string'
        ? payload.machine_id
        : typeof readingSource.machine_id === 'string'
          ? readingSource.machine_id
          : '';

      if (!machineId) {
        return;
      }

      if (Boolean(readingSource.predicted ?? payload.predicted ?? false)) {
        setState(prev => ({ ...prev, syntheticMode: true }));
      }

      updateReading({
        machine_id: machineId,
        timestamp: typeof payload.timestamp === 'string' ? payload.timestamp : undefined,
        temperature_C: Number(readingSource.temperature_C ?? payload.temperature_C ?? 0),
        vibration_mm_s: Number(readingSource.vibration_mm_s ?? payload.vibration_mm_s ?? 0),
        rpm: Number(readingSource.rpm ?? payload.rpm ?? 0),
        current_A: Number(readingSource.current_A ?? payload.current_A ?? 0),
        status: typeof readingSource.status === 'string' ? readingSource.status : undefined,
        regime: typeof payload.regime === 'string' ? payload.regime : undefined,
        predicted: Boolean(readingSource.predicted ?? payload.predicted ?? false),
        piv_accepted: Boolean(payload.piv_accepted ?? true),
        piv_reason: typeof payload.piv_reason === 'string' ? payload.piv_reason : undefined,
        anomaly_types: Array.isArray(payload.anomaly_types)
          ? payload.anomaly_types.filter((value): value is string => typeof value === 'string')
          : undefined,
        z_scores: payload.z_scores && typeof payload.z_scores === 'object'
          ? (payload.z_scores as Record<string, number>)
          : undefined,
        cusum_values: payload.cusum_values && typeof payload.cusum_values === 'object'
          ? (payload.cusum_values as Record<string, number>)
          : undefined,
        risk_score: Number(payload.risk_score ?? payload.riskScore ?? 0),
        explanation: typeof payload.explanation === 'string' ? payload.explanation : undefined,
      });
      return;
    }

    if (eventType === 'manual_alert') {
      setState(prev => {
        const alert = mapAlert(payload, 'alert', prev.lastAlertId + 1);
        return {
          ...prev,
          alerts: [alert, ...prev.alerts].slice(0, 50),
          agentMessages: [...prev.agentMessages, formatAgentMessage('Orchestrator', `${alert.machine_id} manual alert posted`)].slice(-60),
          lastAlertId: prev.lastAlertId + 1,
        };
      });
      return;
    }

    if (eventType === 'manual_maintenance') {
      setState(prev => {
        const alert = mapAlert(payload, 'maintenance', prev.lastAlertId + 1);
        return {
          ...prev,
          alerts: [alert, ...prev.alerts].slice(0, 50),
          agentMessages: [...prev.agentMessages, formatAgentMessage('Orchestrator', `${alert.machine_id} maintenance queued`)].slice(-60),
          lastAlertId: prev.lastAlertId + 1,
        };
      });
    }
  }, [updateReading]);

  useEffect(() => {
    if (!state.syntheticMode) {
      syntheticConsoleRef.current = 0;
      return;
    }

    const tick = () => {
      setState(prev => {
        if (!prev.syntheticMode) {
          return prev;
        }

        const readings = { ...prev.readings };
        const sparklines = { ...prev.sparklines };
        const trendSeries = { ...prev.trendSeries };
        const alerts = [...prev.alerts];
        const now = Date.now();

        for (const machine of MACHINES) {
          const reading = generateNextReading(machine.id);
          const nextReading: SensorReading = {
            ...reading,
            predicted: true,
            status: prev.shadowMachines.has(machine.id) ? 'shadow' : reading.status,
          };

          readings[machine.id] = nextReading;
          const sparkline = sparklines[machine.id] ?? [];
          sparklines[machine.id] = [...sparkline.slice(-19), nextReading.temperature_C];
          trendSeries[machine.id] = appendTrendSeries(trendSeries[machine.id], nextReading);

          if (nextReading.status !== 'shadow' && nextReading.riskScore >= 75) {
            const recentlyAlerted = alerts.find(
              alert =>
                alert.machine_id === machine.id &&
                alert.type === 'verified' &&
                Date.now() - new Date(alert.timestamp).getTime() < 30000,
            );

            if (!recentlyAlerted) {
              alerts.unshift({
                id: `synthetic-${machine.id}-${now}`,
                timestamp: nextReading.timestamp,
                machine_id: machine.id,
                issue: `${machine.id} ${nextReading.riskScore >= 90 ? 'critical' : 'elevated'} risk detected`,
                severity: nextReading.riskScore >= 90 ? 'critical' : 'warning',
                action: nextReading.riskScore >= 90 ? 'Emergency maintenance scheduled' : 'Inspection flagged in queue',
                type: 'verified',
                riskScore: nextReading.riskScore,
              });
            }
          }
        }

        const agentMessages = [...prev.agentMessages];
        if (now - syntheticConsoleRef.current > 4000) {
          const sourceMachine = MACHINES[Math.floor(Math.random() * MACHINES.length)]?.id ?? 'SYSTEM';
          const sample = readings[sourceMachine] ?? readings[MACHINES[0]?.id ?? ''];
          if (sample) {
            agentMessages.push(
              formatAgentMessage('Sentinel', `${sourceMachine} synthetic pulse ${Math.round(sample.riskScore)}% risk, ${sample.status}${sample.predicted ? ' (predicted)' : ''}`),
              formatAgentMessage('Physicist', `${sourceMachine} mechanics stable: vibration ${sample.vibration_mm_s.toFixed(2)} mm/s.`),
              formatAgentMessage('Historian', `${sourceMachine} remains within its rolling baseline pattern.`),
              formatAgentMessage('Orchestrator', `${sourceMachine} routing synthetic telemetry into the dashboard.`),
            );
            syntheticConsoleRef.current = now;
          }
        }

        return {
          ...prev,
          readings,
          sparklines,
          trendSeries,
          alerts: alerts.slice(0, 50),
          agentMessages: agentMessages.slice(-60),
          surgeDetected: Object.values(readings).filter(item => item.riskScore >= 85).length >= 3,
        };
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.syntheticMode]);

  useEffect(() => {
    const abortController = new AbortController();

    const loadSnapshot = async () => {
      try {
        const response = await fetch(`${BACKEND_HTTP_URL}/state`, {
          cache: 'no-store',
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`GET /state failed with ${response.status}`);
        }

        const payload = await response.json() as BackendStateResponse;
        seedFromBackend(payload);
      } catch {
        const syntheticReadings: Record<string, SensorReading> = {};
        const syntheticSparklines: Record<string, number[]> = {};
        const syntheticTrendSeries: Record<string, TrendSeries> = {};

        for (const machine of MACHINES) {
          const reading = generateNextReading(machine.id);
          const nextReading: SensorReading = { ...reading, predicted: true };
          syntheticReadings[machine.id] = nextReading;
          syntheticSparklines[machine.id] = [nextReading.temperature_C];
          syntheticTrendSeries[machine.id] = appendTrendSeries(undefined, nextReading);
        }

        setState(prev => ({
          ...prev,
          readings: syntheticReadings,
          sparklines: syntheticSparklines,
          trendSeries: syntheticTrendSeries,
          alerts: generateInitialAlerts(),
          agentMessages: generateAgentMessages(),
          syntheticMode: true,
        }));
      }
    };

    void loadSnapshot();

    return () => {
      abortController.abort();
    };
  }, [seedFromBackend]);

  useEffect(() => {
    let closed = false;

    const connect = () => {
      const socket = new WebSocket(toWebSocketUrl(BACKEND_HTTP_URL));
      socketRef.current = socket;

      socket.onmessage = event => {
        try {
          const payload = JSON.parse(event.data as string) as Record<string, unknown>;
          applyWsEvent(payload);
        } catch {
          // Ignore malformed packets and wait for the next update.
        }
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (closed) {
          return;
        }

        reconnectRef.current = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
      socketRef.current?.close();
    };
  }, [applyWsEvent]);

  const injectChaos = useCallback((machineId: string) => {
    setState(prev => {
      const existing = prev.readings[machineId];
      const alerts = [...prev.alerts];
      alerts.unshift({
        id: `chaos-${machineId}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        machine_id: machineId,
        issue: `Chaos injected into ${machineId}`,
        severity: 'info',
        action: 'Waiting for next backend update',
        type: 'suppressed',
        reason: 'Operator simulation',
        riskScore: 0,
      });

      return {
        ...prev,
        chaosMachineId: machineId,
        readings: existing
          ? {
              ...prev.readings,
              [machineId]: {
                ...existing,
                riskScore: Math.min(100, existing.riskScore + 30),
                status: existing.riskScore + 30 >= 90 ? 'fault' : 'warning',
                anomalyType: existing.anomalyType ?? 'chaos',
              },
            }
          : prev.readings,
        alerts: alerts.slice(0, 50),
        agentMessages: [...prev.agentMessages, formatAgentMessage('System', `Chaos injected for ${machineId}`)].slice(-60),
        lastAlertId: prev.lastAlertId + 1,
      };
    });
  }, []);

  const toggleShadow = useCallback((machineId: string) => {
    setState(prev => {
      const next = new Set(prev.shadowMachines);
      if (next.has(machineId)) {
        next.delete(machineId);
      } else {
        next.add(machineId);
      }

      const existing = prev.readings[machineId];
      const readings = existing
        ? {
            ...prev.readings,
            [machineId]: {
              ...existing,
              status: next.has(machineId) ? 'shadow' : toStatus(existing.status, false, existing.riskScore),
            },
          }
        : prev.readings;

      return { ...prev, shadowMachines: next, readings };
    });
  }, []);

  const triggerSurge = useCallback(() => {
    setState(prev => ({
      ...prev,
      surgeDetected: true,
      chaosMachineId: MACHINES[0]?.id ?? null,
      agentMessages: [...prev.agentMessages, formatAgentMessage('Orchestrator', 'Cross-machine surge triggered')].slice(-60),
    }));
  }, []);

  const dismissSurge = useCallback(() => {
    setState(prev => ({ ...prev, surgeDetected: false }));
  }, []);

  return {
    readings: state.readings,
    sparklines: state.sparklines,
    trendSeries: state.trendSeries,
    alerts: state.alerts,
    agentMessages: state.agentMessages,
    shadowMachines: state.shadowMachines,
    surgeDetected: state.surgeDetected,
    injectChaos,
    toggleShadow,
    triggerSurge,
    dismissSurge,
  };
}
