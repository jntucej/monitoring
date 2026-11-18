// src/components/RoleThemeProvider.tsx
//
// Wraps a role's layout.tsx and injects the role's identity CSS vars.
// One CSS variable swap changes the entire feel: accent, tint, radius.
//
//   import { RoleThemeProvider } from "@/components/RoleThemeProvider";
//
//   // In layout.tsx:
//   return <RoleThemeProvider>{children}</RoleThemeProvider>;
//
// The provider reads the role from the auth store (post-login) and
// sets --role-accent, --role-tint, --role-radius on the root div.

"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { getRoleConfig } from "@/config/roles";

// CSS variable map: accent name → hex value
// These are the L1 identity layer — each role gets a distinct palette.
const ACCENT_MAP: Record<string, { accent: string; accentMuted: string; tint: string; radius: string }> = {
  teal:           { accent: "#0d9488", accentMuted: "#5eead4", tint: "#f0fdfa", radius: "0.5rem" },
  "calm-blue":    { accent: "#3b82f6", accentMuted: "#93c5fd", tint: "#eff6ff", radius: "0.375rem" },
  slate:          { accent: "#475569", accentMuted: "#94a3b8", tint: "#f8fafc", radius: "0.375rem" },
  indigo:         { accent: "#4338ca", accentMuted: "#818cf8", tint: "#eef2ff", radius: "0.375rem" },
  navy:           { accent: "#1e3a8a", accentMuted: "#60a5fa", tint: "#f8fafc", radius: "0.375rem" },
  yellow:         { accent: "#eab308", accentMuted: "#fde047", tint: "#fefce8", radius: "0.375rem" },
  steel:          { accent: "#475569", accentMuted: "#cbd5e1", tint: "#f0f9ff", radius: "0.5rem" },
  burgundy:       { accent: "#881337", accentMuted: "#fda4af", tint: "#fef2f2", radius: "0.375rem" },
  saffron:        { accent: "#d97706", accentMuted: "#fbbf24", tint: "#fffbeb", radius: "0.5rem" },
  charcoal:       { accent: "#1e293b", accentMuted: "#64748b", tint: "#f8fafc", radius: "0.375rem" },
  "terminal-green":{ accent: "#16a34a", accentMuted: "#4ade80", tint: "#0a0f0a", radius: "0.375rem" },
  sky:            { accent: "#0ea5e9", accentMuted: "#7dd3fc", tint: "#f0f9ff", radius: "0.5rem" },
  olive:          { accent: "#65a30d", accentMuted: "#a3e635", tint: "#f5f5f4", radius: "0.75rem" },
  earth:          { accent: "#92400e", accentMuted: "#d97706", tint: "#f5f5dc", radius: "0.375rem" },
  "warm-red":     { accent: "#dc2626", accentMuted: "#f87171", tint: "#fef2f2", radius: "0.375rem" },
  "red-orange":   { accent: "#dc2626", accentMuted: "#fb923c", tint: "#fff7ed", radius: "0.375rem" },
  amber:          { accent: "#d97706", accentMuted: "#fbbf24", tint: "#fffbeb", radius: "0.375rem" },
  orange:         { accent: "#ea580c", accentMuted: "#fb923c", tint: "#fff7ed", radius: "0.375rem" },
  forest:         { accent: "#166534", accentMuted: "#4ade80", tint: "#f0fdf4", radius: "0.375rem" },
  "royal-purple": { accent: "#7c3aed", accentMuted: "#c4b5fd", tint: "#faf5ff", radius: "0.375rem" },
  graphite:       { accent: "#64748b", accentMuted: "#94a3b8", tint: "#f8fafc", radius: "0.375rem" },
};

export function RoleThemeProvider({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.role);
  const cfg = role ? getRoleConfig(role) : undefined;

  useEffect(() => {
    const accentName = cfg?.identity.accent ?? "graphite";
    const colors = ACCENT_MAP[accentName] ?? ACCENT_MAP.graphite;
    const root = document.documentElement;

    root.style.setProperty("--role-accent", colors.accent);
    root.style.setProperty("--role-accent-muted", colors.accentMuted);
    root.style.setProperty("--role-tint", colors.tint);
    root.style.setProperty("--role-radius", colors.radius);

    // Motion preset: set on <html> as data-motion attribute
    root.setAttribute("data-motion", cfg?.identity.motionPreset ?? "calm");

    return () => {
      root.removeAttribute("data-motion");
    };
  }, [cfg?.identity.accent, cfg?.identity.motionPreset, cfg?.identity.radius]);

  return <>{children}</>;
}
