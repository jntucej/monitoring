"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { MagneticButton } from "../ui/MagneticButton";

const STORAGE_KEY = "home-sound";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "on") setEnabled(true);
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    sessionStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  };

  if (!mounted) return null;

  return (
    <MagneticButton
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Mute ambient sound" : "Enable ambient sound"}
      className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--home-border-soft)] bg-[rgba(10,10,15,0.7)] text-[var(--home-text-secondary)] backdrop-blur-md transition-colors hover:text-[var(--home-text-primary)]"
      style={{ boxShadow: "var(--home-shadow-glow)" }}
    >
      {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </MagneticButton>
  );
}
