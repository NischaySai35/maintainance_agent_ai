'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { getRiskColor } from '@/lib/utils';

function EntropySphereInner({ risk, isShadow }: { risk: number; isShadow: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = isShadow ? '#6b7280' : getRiskColor(risk);

  // Normalized intensity (0-1)
  const intensity = risk / 100;

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Rotation speed scales with risk
      meshRef.current.rotation.y += delta * (0.15 + intensity * 0.6);
      meshRef.current.rotation.x += delta * 0.05;

      // Subtle breathing scale
      const scale = 1 + Math.sin(state.clock.elapsedTime * (1 + intensity * 2)) * 0.02 * (1 + intensity);
      meshRef.current.scale.setScalar(scale);
    }
  });

  const segments = risk > 80 ? 12 : risk > 50 ? 20 : 32;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.2, segments, segments]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isShadow ? 0.05 : 0.15 + intensity * 0.4}
        roughness={0.3}
        metalness={0.8}
        wireframe={risk > 80}
        transparent
        opacity={isShadow ? 0.3 : 0.85}
      />
    </mesh>
  );
}

// Ambient ring around sphere
function AmbientRing({ risk }: { risk: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const color = getRiskColor(risk);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.8, 0.01, 8, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.2} />
    </mesh>
  );
}

interface EntropySphereProps {
  machineId: string;
  riskScore: number;
  isShadow: boolean;
}

export default function EntropySphere({ machineId, riskScore, isShadow }: EntropySphereProps) {
  return (
    <div className="w-full h-full min-h-[300px] rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-3, -3, 3]} intensity={0.5} color={getRiskColor(riskScore)} />
        <pointLight position={[0, -5, -2]} intensity={0.3} color="#1e40af" />
        <Suspense fallback={null}>
          <EntropySphereInner risk={riskScore} isShadow={isShadow} />
          {!isShadow && <AmbientRing risk={riskScore} />}
        </Suspense>
      </Canvas>
    </div>
  );
}
