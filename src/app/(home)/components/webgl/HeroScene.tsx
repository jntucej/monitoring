"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { HomeAccent } from "../cinematic";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export interface HeroSceneProps {
  accent: HomeAccent;
}

function accentToColor(accent: HomeAccent): THREE.Color {
  const map: Record<HomeAccent, string> = {
    amber: "#F59E0B",
    indigo: "#6366F1",
    steel: "#0EA5E9",
    crimson: "#EF4444",
    navy: "#1E3A5F",
  };
  return new THREE.Color(map[accent]);
}

export function HeroScene({ accent }: HeroSceneProps) {
  const reduced = useReducedMotionSafe();
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const rimLight = useRef<THREE.DirectionalLight>(null);
  const gateRef = useRef<THREE.Mesh>(null);
  const targetColor = accentToColor(accent);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const tx = 0;
    const ty = 0.3;
    const tz = 4;
    const ease = reduced ? 1 : 1 - Math.pow(0.001, delta * 1.5);

    state.camera.position.x += (tx - state.camera.position.x) * ease;
    state.camera.position.y += (ty - state.camera.position.y) * ease;
    state.camera.position.z += (tz - state.camera.position.z) * ease;
    state.camera.lookAt(0, 0, 0);

    if (keyLight.current) {
      keyLight.current.color.lerp(targetColor, delta * 2);
    }
    if (rimLight.current) {
      rimLight.current.color.lerp(targetColor, delta * 2);
    }

    if (!reduced && gateRef.current) {
      gateRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.15) * 0.08;
      gateRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.35) * 0.05;
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        ref={keyLight}
        position={[3, 3, 3]}
        intensity={1.2}
        color={targetColor}
      />
      <directionalLight
        ref={rimLight}
        position={[-2, 1, -2]}
        intensity={0.6}
        color={targetColor}
      />
      <mesh ref={gateRef} position={[0, 0, 0]}>
        <boxGeometry args={[1, 1.6, 0.2]} />
        <meshStandardMaterial
          color={targetColor}
          metalness={0.6}
          roughness={0.3}
          emissive={targetColor}
          emissiveIntensity={0.15}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#0A0A0F"
          metalness={0.9}
          roughness={0.4}
        />
      </mesh>
    </>
  );
}
