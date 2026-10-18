"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { HomeAccent } from "../cinematic";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export interface GlassDashboardProps {
  reveal: number;
  accent: HomeAccent;
}

const ACCENT_HEX: Record<HomeAccent, string> = {
  amber: "#F59E0B",
  indigo: "#6366F1",
  steel: "#0EA5E9",
  crimson: "#EF4444",
  navy: "#1E3A5F",
};

interface PanelDef {
  id: string;
  label: string;
  value: string;
  rest: [number, number, number];
  scatter: [number, number, number];
}

const PANELS: PanelDef[] = [
  { id: "scan", label: "Scan Rate", value: "98.4%", rest: [-1.2, 0.4, 0], scatter: [-4, 2, 1] },
  { id: "campus", label: "On Campus", value: "2,847", rest: [0, 0.4, 0.2], scatter: [0, 3, -1] },
  { id: "alerts", label: "Open Alerts", value: "3", rest: [1.2, 0.4, 0], scatter: [4, 2, 1] },
];

export function GlassDashboard({ reveal, accent }: GlassDashboardProps) {
  const reduced = useReducedMotionSafe();
  const groupRef = useRef<THREE.Group>(null);
  const accentColor = useMemo(() => new THREE.Color(ACCENT_HEX[accent]), [accent]);

  useFrame((_, rawDelta) => {
    if (!groupRef.current) return;
    const delta = Math.min(rawDelta, 0.1);
    const target = reduced ? 1 : reveal;

    groupRef.current.children.forEach((child, i) => {
      const def = PANELS[i];
      if (!def) return;

      const ease = 1 - Math.pow(0.001, delta * 3);
      child.position.x += (def.rest[0] - (def.scatter[0] * (1 - target) + def.rest[0] * target)) * ease;
      child.position.y += (def.rest[1] - (def.scatter[1] * (1 - target) + def.rest[1] * target)) * ease;
      child.position.z += (def.rest[2] - (def.scatter[2] * (1 - target) + def.rest[2] * target)) * ease;

      child.scale.setScalar(0.4 + 0.6 * target);
      const mat = (child as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
      if (mat && "opacity" in mat) {
        mat.opacity = Math.max(0.1, target);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {PANELS.map((panel) => (
        <group key={panel.id}>
          <mesh>
            <planeGeometry args={[1, 1.2]} />
            <meshPhysicalMaterial
              color={accentColor}
              transmission={0.9}
              roughness={0.15}
              thickness={0.4}
              ior={1.4}
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0, 0.001]}>
            <planeGeometry args={[1.02, 1.22]} />
            <meshBasicMaterial
              color={accentColor}
              transparent
              opacity={0.08}
              wireframe
            />
          </mesh>
          <Text
            position={[0, 0.4, 0.01]}
            fontSize={0.09}
            color="#F8FAFC"
            anchorX="center"
            anchorY="middle"
          >
            {panel.label}
          </Text>
          <Text
            position={[0, 0.05, 0.01]}
            fontSize={0.22}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
          >
            {panel.value}
          </Text>
        </group>
      ))}
    </group>
  );
}
