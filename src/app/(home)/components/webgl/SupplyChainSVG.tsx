"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { HomeAccent } from "../cinematic";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export interface SupplyChainSVGProps {
  draw: number;
  accent: HomeAccent;
  visible: boolean;
}

const ACCENT_RGB: Record<HomeAccent, string> = {
  amber: "#F59E0B",
  indigo: "#6366F1",
  steel: "#0EA5E9",
  crimson: "#EF4444",
  navy: "#1E3A5F",
};

export function SupplyChainSVG({
  draw,
  accent,
  visible,
}: SupplyChainSVGProps) {
  const reduced = useReducedMotionSafe();
  const travelersRef = useRef<THREE.Group>(null);
  const color = ACCENT_RGB[accent];

  const curves = useMemo(
    () => [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3, -0.5, 0),
        new THREE.Vector3(-1, 0.5, 0.5),
        new THREE.Vector3(1, 0.3, -0.5),
        new THREE.Vector3(3, -0.5, 0),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3, 0.3, -1),
        new THREE.Vector3(-1, 1.1, -0.5),
        new THREE.Vector3(1, 0.9, 0.5),
        new THREE.Vector3(3, 0.2, 1),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.5, -1.2, 0.5),
        new THREE.Vector3(0, -0.4, -0.3),
        new THREE.Vector3(2.5, -1.1, -0.5),
      ]),
    ],
    []
  );

  const geometries = useMemo(() => {
    return curves.map((c) => {
      const pts = c.getPoints(100);
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      return g;
    });
  }, [curves]);

  useFrame((state) => {
    if (!travelersRef.current || reduced || !visible) return;
    const t = state.clock.elapsedTime * 0.15;
    travelersRef.current.children.forEach((child, i) => {
      const curve = curves[i];
      const u = (t + i * 0.3) % 1;
      const p = curve.getPoint(u);
      child.position.copy(p);
    });
  });

  if (!visible) return null;

  return (
    <group>
      {geometries.map((geo, i) => {
        return (
          <group key={i}>
            <primitive
              object={new THREE.Line(
                geo,
                new THREE.LineBasicMaterial({
                  color,
                  transparent: true,
                  opacity: 0.15,
                })
              )}
            />
            <primitive
              object={new THREE.Line(
                geo,
                new THREE.LineBasicMaterial({
                  color,
                  transparent: true,
                  opacity: 0.9 * draw,
                })
              )}
            />
          </group>
        );
      })}
      <group ref={travelersRef}>
        {curves.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
