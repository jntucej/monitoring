"use client";

import { useEffect, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/utils";

/**
 * S3: Active sessions — reads /api/me/access-log (real endpoint) and offers
 * a sign-out-all CTA. The "Active sessions" card on /student/profile-security
 * links here, not to the decorative /security posture infographic.
 */
export default function SessionsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>> | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/access-log", { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => { if (!cancelled) setRows(j.data ?? []); })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, []);

  const signOutAll = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout-all", { method: "POST", headers: getAuthHeaders() });
    } finally {
      window.location.href = "/login";
    }
  };

  if (!rows) return <PageLoading />;

  return (
    <div className="space-y-3 p-4">
      <h1 className="text-lg font-semibold">Active sessions</h1>
      <ul className="space-y-2">
        {rows.length === 0 ? (
          <li className="text-sm text-[var(--text-muted)]">No recorded sessions.</li>
        ) : (
          rows.map((r, i) => (
            <li key={i} className="rounded-lg border border-[var(--border)] p-3 text-sm">
              {String(r.ip_address ?? "unknown")} · {String(r.user_agent ?? "—")} ·{" "}
              {String(r.created_at ?? "—")}
            </li>
          ))
        )}
      </ul>
      <Button variant="secondary" onClick={signOutAll} disabled={signingOut}>
        {signingOut ? "Signing out…" : "Sign out all sessions"}
      </Button>
    </div>
  );
}
