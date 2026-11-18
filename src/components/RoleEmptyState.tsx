// src/components/RoleEmptyState.tsx
//
// <RoleEmptyState surface="passes" /> — renders the role-specific
// empty copy from the config. No hardcoded strings in role pages.

"use client";

import { useRoleConfig } from "@/hooks/useRoleConfig";

interface Props {
  surface: string;
  icon?: React.ReactNode;
}

export function RoleEmptyState({ surface, icon }: Props) {
  const cfg = useRoleConfig();
  const copy = cfg?.emptyCopy[surface] ?? "Nothing here yet.";

  return (
    <div
      data-testid="role-empty-state"
      className="flex flex-col items-center gap-3 p-8 text-center"
      style={{ color: "var(--text-muted)" }}
    >
      {icon && <div className="text-2xl opacity-50">{icon}</div>}
      <p className="text-sm">{copy}</p>
    </div>
  );
}
