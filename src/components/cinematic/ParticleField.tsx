"use client";

import { useEffect, useRef } from "react";

interface ParticleFieldProps {
  color?: string;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
}

/** Three depth layers — far / mid / near — for cinematic parallax without overwhelm. */
const LAYERS = [
  { count: 24, rMin: 0.4, rMax: 0.8, aMin: 0.06, aMax: 0.12, speed: 0.02 },
  { count: 14, rMin: 0.8, rMax: 1.2, aMin: 0.12, aMax: 0.20, speed: 0.035 },
  { count:  8, rMin: 1.2, rMax: 2.0, aMin: 0.20, aMax: 0.32, speed: 0.055 },
];

export function ParticleField({ color = "#67e8f9", className = "" }: ParticleFieldProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    let particles: Particle[] = [];
    let raf: number | null = null;

    const seed = () => {
      particles = [];
      for (const layer of LAYERS) {
        for (let i = 0; i < layer.count; i++) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: layer.rMin + Math.random() * (layer.rMax - layer.rMin),
            vx: (Math.random() - 0.5) * layer.speed,
            vy: (Math.random() - 0.5) * layer.speed,
            a: layer.aMin + Math.random() * (layer.aMax - layer.aMin),
          });
        }
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const tick = () => {
      if (document.hidden) {
        raf = null;
        return;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };

    resize();
    raf = requestAnimationFrame(tick);

    const onVis = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
      } else if (!raf) {
        raf = requestAnimationFrame(tick);
      }
    };

    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
    };
  }, [color]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
