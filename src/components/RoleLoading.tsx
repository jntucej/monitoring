// src/components/RoleLoading.tsx
//
// <RoleLoading surface="dashboard" /> — shows the role-specific
// loading copy with a spinner. Trivial to implement, high emotional
// impact: "Pulling your department's pulse…" instead of "Loading…".

"use client";

import { useRoleConfig } from "@/hooks/useRoleConfig";

interface Props {
  surface: string;
}

export function RoleLoading({ surface }: Props) {
  const cfg = useRoleConfig();
  const copy = cfg?.loadingCopy[surface] ?? "Loading…";

  return (
    <div
      data-testid="role-loading"
      className="flex items-center gap-2 p-4 text-sm"
      style={{ color: "var(--text-muted)" }}
    >
      <div
        className="h-4 w-4 animate-spin rounded-full border-2"
        style={{
          borderColor: "var(--role-accent, var(--action-primary))",
          borderTopColor: "transparent",
        }}
      />
      <span>{copy}</span>
    </div>
  );
}
