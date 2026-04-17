'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { generateNextReading, type SensorReading, type AlertEntry, generateInitialAlerts, generateAgentMessages } from '@/lib/mockData';
import { MACHINES } from '@/lib/constants';

interface StreamState {
  readings: Record<string, SensorReading>;
  sparklines: Record<string, number[]>;
  alerts: AlertEntry[];
  agentMessages: { agent: string; message: string; time: string }[];
  shadowMachines: Set<string>;
  chaosMachineId: string | null;
  surgeDetected: boolean;
  lastAlertId: number;
}

export function useSimulatedStream() {
  const [state, setState] = useState<StreamState>({
    readings: {},
    sparklines: {},
    alerts: generateInitialAlerts(),
    agentMessages: generateAgentMessages(),
    shadowMachines: new Set(),
    chaosMachineId: null,
    surgeDetected: false,
    lastAlertId: 10,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const tick = useCallback(() => {
    setState(prev => {
      const newReadings = { ...prev.readings };
      const newSparklines = { ...prev.sparklines };
      const newAlerts = [...prev.alerts];
      const newMessages = [...prev.agentMessages];
      let lastAlertId = prev.lastAlertId;
      let surgeDetected = false;

      const spikingMachines: string[] = [];

      MACHINES.forEach(machine => {
        const isShadow = prev.shadowMachines.has(machine.id);
        const injectSpike = prev.chaosMachineId === machine.id;

        const reading = generateNextReading(machine.id, injectSpike, isShadow);
        newReadings[machine.id] = reading;

        // Maintain sparkline (last 20 readings of temperature)
        const existing = newSparklines[machine.id] || [];
        newSparklines[machine.id] = [...existing.slice(-19), reading.temperature_C];

        // Track physics violations
        if (reading.physicsBlocked) {
          spikingMachines.push(machine.id);
          const ghostAlert: AlertEntry = {
            id: String(++lastAlertId),
            timestamp: new Date().toISOString(),
            machine_id: machine.id,
            issue: `Transient spike: 999°C reading intercepted`,
            severity: 'info',
            action: 'Blocked by Physics Firewall — zero risk impact',
            type: 'suppressed',
            reason: 'Thermal Inertia Exceeded',
            physicsRule: reading.blockReason,
            riskScore: 0,
          };
          newAlerts.unshift(ghostAlert);
          newMessages.push(
            { agent: 'Sentinel', message: `${machine.id} → Extreme spike detected: 999°C reading`, time: new Date().toISOString() },
            { agent: 'Physicist', message: `${machine.id} → Impossible thermal transition. Rate > 900°C/s. Physical limit: 5°C/s.`, time: new Date().toISOString() },
            { agent: 'Historian', message: `${machine.id} → No historical match for 999°C operating regime.`, time: new Date().toISOString() },
            { agent: 'Orchestrator', message: `${machine.id} → Noise suppressed. Risk score unchanged. "Silent when safe."`, time: new Date().toISOString() },
          );
        }

        // Real anomaly alerts
        if (!reading.physicsBlocked && reading.riskScore >= 75 && !isShadow) {
          if (!newAlerts.find(a => a.machine_id === machine.id && a.type === 'verified' && Date.now() - new Date(a.timestamp).getTime() < 30000)) {
            const alert: AlertEntry = {
              id: String(++lastAlertId),
              timestamp: new Date().toISOString(),
              machine_id: machine.id,
              issue: `${reading.anomalyType === 'compound' ? 'Compound anomaly' : reading.anomalyType === 'drift' ? 'Sustained drift' : 'Elevated readings'} detected`,
              severity: reading.riskScore >= 90 ? 'critical' : 'warning',
              action: reading.riskScore >= 90 ? 'Emergency maintenance scheduled' : 'Inspection flagged in queue',
              type: 'verified',
              riskScore: reading.riskScore,
            };
            newAlerts.unshift(alert);
          }
        }
      });

      // Cross-machine surge
      if (spikingMachines.length >= 3) {
        surgeDetected = true;
      }

      return {
        ...prev,
        readings: newReadings,
        sparklines: newSparklines,
        alerts: newAlerts.slice(0, 50),
        agentMessages: newMessages.slice(-60),
        chaosMachineId: null, // reset after one tick
        surgeDetected,
        lastAlertId,
      };
    });
  }, []);

  useEffect(() => {
    tick(); // initial
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [tick]);

  const injectChaos = useCallback((machineId: string) => {
    setState(prev => ({ ...prev, chaosMachineId: machineId }));
  }, []);

  const toggleShadow = useCallback((machineId: string) => {
    setState(prev => {
      const next = new Set(prev.shadowMachines);
      if (next.has(machineId)) next.delete(machineId);
      else next.add(machineId);
      return { ...prev, shadowMachines: next };
    });
  }, []);

  const triggerSurge = useCallback(() => {
    MACHINES.forEach(m => {
      setState(prev => ({ ...prev, chaosMachineId: m.id }));
    });
  }, []);

  const dismissSurge = useCallback(() => {
    setState(prev => ({ ...prev, surgeDetected: false }));
  }, []);

  return {
    readings: state.readings,
    sparklines: state.sparklines,
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
