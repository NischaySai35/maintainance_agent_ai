/**
 * StateSpacePlot — 3D scatter plot showing the current sensor state of every
 * machine in Temperature × Vibration × RPM space.
 *
 * A "state dot" that moves outside the main cluster turns red, signalling
 * an anomaly.  The axes are normalised around typical operating values.
 */
"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { MachineCache } from "../hooks/useSSE";

// Reference centre & scale for normalisation
const T_REF = 67;   // °C
const T_SCALE = 8;
const V_REF = 1.4;  // g
const V_SCALE = 0.6;
const R_REF = 1400; // rpm
const R_SCALE = 400;

// Outlier threshold in normalised units
const OUTLIER_THRESH = 1.8;

interface DotProps {
  position: [number, number, number];
  isOutlier: boolean;
}

function StateDot({ position, isOutlier }: DotProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (isOutlier && meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 5) * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial
        color={isOutlier ? "#ef4444" : "#38bdf8"}
        emissive={isOutlier ? "#ef4444" : "#38bdf8"}
        emissiveIntensity={isOutlier ? 0.5 : 0.1}
      />
    </mesh>
  );
}

/** Thin axis line helper — uses primitive to avoid JSX/SVG <line> ambiguity */
function Axis({ start, end, color }: { start: [number, number, number]; end: [number, number, number]; color: string }) {
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, opacity: 0.4, transparent: true });
  const lineObj = new THREE.Line(geo, mat);
  return <primitive object={lineObj} />;
}

interface Props {
  machines: Record<string, MachineCache>;
}

export default function StateSpacePlot({ machines }: Props) {
  const entries = Object.entries(machines);

  return (
    <div className="h-64 rounded-lg border border-slate-700 bg-slate-900/80">
      <Canvas camera={{ position: [3, 3, 5], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[5, 5, 5]} intensity={1} />

        {/* Axes */}
        <Axis start={[-3, 0, 0]} end={[3, 0, 0]} color="#f87171" />  {/* T */}
        <Axis start={[0, -3, 0]} end={[0, 3, 0]} color="#4ade80" />  {/* V */}
        <Axis start={[0, 0, -3]} end={[0, 0, 3]} color="#60a5fa" />  {/* R */}

        {entries.map(([id, state]) => {
          const tx = (state.reading.temperature - T_REF) / T_SCALE;
          const vy = (state.reading.vibration - V_REF) / V_SCALE;
          const rz = (state.reading.rpm - R_REF) / R_SCALE;
          const isOutlier =
            Math.abs(tx) > OUTLIER_THRESH ||
            Math.abs(vy) > OUTLIER_THRESH ||
            Math.abs(rz) > OUTLIER_THRESH;
          return (
            <StateDot
              key={id}
              position={[tx, vy, rz]}
              isOutlier={isOutlier}
            />
          );
        })}
      </Canvas>
    </div>
  );
}
