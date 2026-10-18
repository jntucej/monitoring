"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { HomeAccent } from "../cinematic";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export interface ParticleFieldProps {
  accent: HomeAccent;
}

const ACCENT_RGB: Record<HomeAccent, [number, number, number]> = {
  amber: [0.961, 0.620, 0.043],
  indigo: [0.388, 0.400, 0.945],
  steel: [0.055, 0.647, 0.914],
  crimson: [0.937, 0.267, 0.267],
  navy: [0.118, 0.227, 0.373],
};

export function ParticleField({ accent }: ParticleFieldProps) {
  const tier = usePerformanceTier();
  const reduced = useReducedMotionSafe();
  const pointsRef = useRef<THREE.Points>(null);
  const count = tier === "reduced" ? 1500 : 4000;
  const accentRgb = ACCENT_RGB[accent];

  const { positions, phases, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
      phase[i] = Math.random() * Math.PI * 2;
      size[i] = 0.5 + Math.random() * 1.5;
    }
    return { positions: pos, phases: phase, sizes: size };
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current || reduced) return;
    const t = state.clock.elapsedTime;
    pointsRef.current.rotation.y = t * 0.02;
    pointsRef.current.rotation.x = Math.sin(t * 0.1) * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          args={[phases, 1]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uAccent: { value: new THREE.Vector3(...accentRgb) },
          uPixelRatio: {
            value:
              typeof window !== "undefined"
                ? Math.min(window.devicePixelRatio, 2)
                : 1,
          },
        }}
        vertexShader={/* glsl */ `
          attribute float aPhase;
          attribute float aSize;
          uniform float uTime;
          uniform float uPixelRatio;
          varying float vAlpha;
          varying float vPhase;
          void main() {
            vec3 p = position;
            p.y += sin(uTime * 0.4 + aPhase) * 0.15;
            p.x += cos(uTime * 0.3 + aPhase) * 0.1;
            vPhase = aPhase;
            vAlpha = 0.5 + 0.5 * sin(uTime * 0.6 + aPhase);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = aSize * uPixelRatio * (30.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uAccent;
          varying float vAlpha;
          varying float vPhase;
          void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float d = length(uv);
            if (d > 0.5) discard;
            float soft = smoothstep(0.5, 0.0, d);
            vec3 col = uAccent * (0.6 + 0.4 * sin(vPhase));
            gl_FragColor = vec4(col, soft * vAlpha * 0.8);
          }
        `}
      />
    </points>
  );
}
