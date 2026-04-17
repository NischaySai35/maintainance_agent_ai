/**
 * EntropySpheres — Zone 2 three-dimensional entropy visualisation.
 *
 * Each machine is represented by a sphere:
 *   · Radius scales with risk score (bigger = riskier)
 *   · Colour transitions: green (healthy) → orange (warning) → red (critical)
 *   · Sphere emissive intensity pulses when risk > 50
 */
"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { MachineCache } from "../hooks/useSSE";

interface SphereProps {
  x: number;
  risk: number;
  label: string;
}

function MachineSphere({ x, risk, label }: SphereProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  const scale = 0.55 + (risk / 100) * 0.55;
  const color =
    risk >= 80 ? "#ef4444" : risk >= 50 ? "#f97316" : "#22c55e";
  const emissiveIntensity = risk >= 50 ? 0.4 : 0.1;

  useFrame(({ clock }) => {
    if (risk >= 50 && meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity =
        emissiveIntensity + Math.sin(clock.elapsedTime * 3) * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={[x, 0, 0]} scale={scale}>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        roughness={0.3}
        metalness={0.25}
      />
    </mesh>
  );
}

interface Props {
  machines: Record<string, MachineCache>;
}

export default function EntropySpheres({ machines }: Props) {
  const entries = Object.entries(machines);
  const spacing = 2.2;
  const totalWidth = (entries.length - 1) * spacing;

  return (
    <div className="h-64 rounded-lg border border-slate-700 bg-slate-900/80">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[8, 8, 8]} intensity={1.2} />
        <pointLight position={[-8, -4, 4]} intensity={0.4} color="#60a5fa" />
        {entries.map(([id, state], idx) => (
          <MachineSphere
            key={id}
            x={idx * spacing - totalWidth / 2}
            risk={state.risk_score}
            label={id}
          />
        ))}
      </Canvas>
    </div>
  );
}
