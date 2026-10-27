"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

interface Fly {
  id: number;
  x: number;
  y: number;
  delay: number;
  size: number;
  color: string;
}

export function Fireflies() {
  const [flies, setFlies] = useState<Fly[]>([]);

  useEffect(() => {
    let buf: string[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onKey = (e: KeyboardEvent) => {
      buf = [...buf, e.key].slice(-SEQUENCE.length);
      if (buf.join(",") !== SEQUENCE.join(",")) return;
      buf = [];
      setFlies(
        Array.from({ length: 32 }, (_, i) => ({
          id: Date.now() + i,
          x: Math.random() * 100,
          y: 15 + Math.random() * 70,
          delay: Math.random() * 2.5,
          size: 2 + Math.random() * 3,
          color: ["#67e8f9", "#a5b4fc", "#f0abfc", "#86efac"][i % 4],
        })),
      );
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setFlies([]), 12_000);
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {flies.length > 0 && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-10">
          {flies.map((f) => (
            <motion.span
              key={f.id}
              className="absolute rounded-full"
              style={{
                left: `${f.x}%`,
                top: `${f.y}%`,
                width: f.size,
                height: f.size,
                background: f.color,
                boxShadow: `0 0 ${f.size * 5}px ${f.color}`,
              }}
              initial={{ opacity: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [0, -40, -80, -120],
                x: [0, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60],
              }}
              transition={{
                duration: 8 + Math.random() * 4,
                delay: f.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
