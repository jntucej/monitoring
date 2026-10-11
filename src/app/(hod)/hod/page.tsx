"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ConditionalAlert } from "@/components/shared/ConditionalAlert";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { getAuthHeaders } from "@/lib/utils";
import { ShieldAlert, RefreshCw } from "lucide-react";

const MIN_TIER = 55;

export default function HodDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "hod") as Role;

  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Hard tier gate -- matches the role-hierarchy contract.
  const tier = getRoleTier(role);
  const canView = tier >= MIN_TIER;

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/security/stats", {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setMetrics(data ?? {});
      } catch {
        // keep previous metrics on transient failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [canView]);

  if (!canView) {
    return (
      <AuthGuard>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4" />
            Access requires tier {'>='} {MIN_TIER}. Your role: {role}.
          </p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Hod Dashboard</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Signed in as <span className="font-mono">{role}</span> · tier {tier}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-elevated)]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </header>

        {/* Role-scoped alerts -- the only line you must keep. */}
                <section aria-label="Active alerts">
                  <ConditionalAlert
                    ctx={{
                      role,
                      userId: user?.id ?? "unknown",
                      gateId: user?.gateId ?? null,
                      departmentId: user?.departmentId ?? null,
                      assignedHostel: user?.assignedHostel ?? null,
                      metrics,
                    }}
                    limit={5}
                  />
                </section>

        {/* TODO: add role-specific widgets below. */}
      </div>
    </AuthGuard>
  );
}
