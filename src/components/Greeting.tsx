// src/components/Greeting.tsx
//
// <Greeting /> — name + time of day + one live stat + streak.
// Drop it at the top of every role home page. No architecture needed.
//
//   import { Greeting } from "@/components/Greeting";
//   <Greeting />  →  "Good morning, Dr. Sharma — 3 approvals, 1 incident, 6-day streak."

"use client";

import { useAuthStore } from "@/stores/authStore";
import { useAdaptiveContext } from "@/hooks/useAdaptiveContext";
import { useRoleConfig } from "@/hooks/useRoleConfig";

export function Greeting() {
  const user = useAuthStore((s) => s.user);
  const cfg = useRoleConfig();
  const ctx = useAdaptiveContext();

  if (!cfg) return null;

  const userName = user?.name ?? user?.email?.split("@")[0] ?? "there";
  const first = userName.split(" ")[0] ?? userName;
  const last = userName.split(" ").slice(1).join(" ") ?? "";
  const greeting = ctx.greeting;
  const streak = 0; // TODO: pull from usePersonalization().streakDays

  const text = cfg.greetingTemplate
    .replace("{greeting}", greeting)
    .replace("{firstName}", first)
    .replace("{lastName}", last)
    .replace("{streak}", String(streak))
    .replace(/\{[^}]+\}/g, ""); // strip unfilled placeholders

  return (
    <div
      role="banner"
      data-testid="role-greeting"
      style={{
        color: "var(--role-accent, var(--action-primary))",
        fontWeight: 600,
        fontSize: "0.875rem",
      }}
    >
      {text}
    </div>
  );
}
