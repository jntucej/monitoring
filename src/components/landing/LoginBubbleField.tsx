"use client";

import { useState } from "react";
import { LoginBubble, type BubbleTone } from "./LoginBubble";
import { RippleAt } from "@/components/cinematic/RippleAt";

interface BubbleSpec {
  label: string;
  sublabel?: string;
  accent: string;
  size: number;
  href: string;
  tone?: BubbleTone;
}

const PRIMARY: BubbleSpec = {
  label: "Sign In",
  sublabel: "enter the campus",
  accent: "#67e8f9",
  size: 168,
  href: "/login",
};

const SECONDARY: BubbleSpec[] = [
  { label: "Help",    sublabel: "how it works", accent: "#94a3b8", size: 100, href: "/help",    tone: "ghost" },
  { label: "About",   sublabel: "the campus",   accent: "#94a3b8", size:  92, href: "/about",   tone: "ghost" },
  { label: "Support", sublabel: "reach us",     accent: "#94a3b8", size:  92, href: "/support", tone: "ghost" },
];

interface Ripple {
  id: number;
  x: number;
  y: number;
  color: string;
}

export function LoginBubbleField() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const addRipple = (x: number, y: number, color: string) => {
    const id = performance.now();
    setRipples((prev) => [...prev, { id, x, y, color }]);
  };

  const removeRipple = (id: number) =>
    setRipples((prev) => prev.filter((r) => r.id !== id));

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-20">
        {ripples.map((r) => (
          <RippleAt
            key={r.id}
            x={r.x}
            y={r.y}
            color={r.color}
            onDone={() => removeRipple(r.id)}
          />
        ))}
      </div>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-14">
        <LoginBubble
          {...PRIMARY}
          seed={0}
          onRipple={(x, y) => addRipple(x, y, PRIMARY.accent)}
        />
        {SECONDARY.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {SECONDARY.map((b, i) => (
              <LoginBubble
                key={b.label}
                {...b}
                seed={i + 1}
                onRipple={(x, y) => addRipple(x, y, b.accent)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
