"use client";

import { useAuthStore } from "@/stores/authStore";

export default function PrincipalProfilePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="p-6 max-w-2xl space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Principal Profile</h1>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-2">
        <p className="text-sm font-semibold">{user?.name || "Principal"}</p>
        <p className="text-sm text-[var(--text-muted)]">{user?.email || "—"}</p>
        <p className="text-xs uppercase text-[var(--action-primary)]">{user?.role || "principal"}</p>
      </div>
    </div>
  );
}
