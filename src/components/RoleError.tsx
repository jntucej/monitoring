// src/components/RoleError.tsx
//
// <RoleError surface="approvals" message="..." onRetry={...} />
// Role-appropriate error recovery — not a generic "Something went wrong".

"use client";

import { useRoleConfig } from "@/hooks/useRoleConfig";

interface Props {
  surface: string;
  message?: string;
  onRetry: () => void;
}

export function RoleError({ surface, message, onRetry }: Props) {
  const cfg = useRoleConfig();
  // Role configs don't have an errorCopy field yet — fall back to a
  // reasonable default that references the surface name.
  const copy =
    message ??
    `We couldn't load ${cfg?.emptyCopy[surface] ? "that data" : surface}. Retry, or check your connection.`;

  return (
    <div
      data-testid="role-error"
      className="flex flex-col items-center gap-3 p-6 text-center"
      style={{ color: "var(--action-danger)" }}
    >
      <p className="text-sm">{copy}</p>
      <button
        onClick={onRetry}
        className="rounded-lg px-4 py-2 text-xs font-semibold"
        style={{
          background: "var(--role-accent, var(--action-primary))",
          color: "white",
        }}
      >
        Try again
      </button>
    </div>
  );
}
