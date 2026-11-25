"use client";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Radio, Users, Clock, MapPin, ExternalLink } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { PageHeader } from "@/components/principal/shared/PrincipalPageHeader";
import { PageLoading as Loading } from "@/components/principal/shared/PrincipalLoadingStates";
import { KpiCard } from "../../../_shared/KpiCard";
import { DataTable } from "@/components/ui/DataTable";
import { SmartTextRef } from "@/components/nav/SmartTextRef";
import { getGateEventRulesForRole } from "@/lib/gate-event-rules";
import { useAuthStore } from "@/stores/authStore";

interface GateMetrics {
  gateId: string;
  gateCode: string;
  gateName: string;
  location: string;
  type: string;
  audience?: string;
  allowedRadiusMeters?: number;
  status: string;
  activeOperator: { name: string; email: string | null; since: string } | null;
  scansToday: number | null;
  entriesToday: number | null;
  exitsToday: number | null;
  peakHour: string | null;
  recentScans: Array<{
    id: string;
    personName: string;
    personRole: string;
    direction: string;
    reason: string | null;
    operator: string | null;
    timestamp: string;
  }>;
}

function verificationLabel(type?: string): { mode: string; detail: string } {
  const t = (type ?? "main").toLowerCase();
  if (t === "hostel") {
    return {
      mode: "QR + Hostel Curfew + Biometric",
      detail: "Verifies active hostel outpass QR, curfew window, and resident block scope.",
    };
  }
  if (t === "backup") {
    return {
      mode: "Manual PIN + QR Fallback",
      detail: "Overflow/backup gate using operator PIN verification and manual roll lookup.",
    };
  }
  if (t === "system") {
    return {
      mode: "System / Audit Fallback",
      detail: "Virtual/system checkpoint for administrative overrides and audit reconciliation.",
    };
  }
  return {
    mode: "QR + Geo-fence + Pass Check",
    detail: "Primary campus perimeter gate verifying QR pass validity and geo-fence radius.",
  };
}

export default function PrincipalGateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const gateId = params?.id ?? "";
  const role = useAuthStore((s) => s.role) ?? "principal";

  const { data, loading } = useApiResource<{ success: boolean; data: GateMetrics }>(
    gateId ? `/api/admin/gates/${gateId}/metrics` : null,
    { ttlMs: 15_000 },
  );

  const gate = data?.data;
  const verif = verificationLabel(gate?.type);
  const rules = gate
    ? getGateEventRulesForRole(
        { role, assignedGateId: gateId },
        { id: gateId, gateCode: gate.gateCode, gateName: gate.gateName, status: gate.status },
      )
    : null;

  return (
    <div
      className="space-y-5"
      data-role-tier={rules ? rules.tierLabel.split("•")[0].trim().toLowerCase().replace(/\s+/g, "-") : "tier-3"}
      data-event-mode={rules?.mode ?? "gate-admin"}
    >
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Detailed operational audit and guard coverage inspection for this specific campus portal"
        why="Inspecting specific gate telemetry verifies turnstile hardware reliability, scanner latency, and guard staffing integrity."
        contextLabel={gate ? `Portal Telemetry · ${gate.gateName || gate.gateCode}` : "Portal Telemetry"}
        statusSummary={gate ? `Status: ${gate.status || "Operational"} · Scans today: ${gate.scansToday ?? "Normal"} · Guard coverage active.` : "Loading portal telemetry..."}
        primaryAction={{ label: "All Campus Gates", href: "/principal/operations/gates" }}
        secondaryAction={{ label: "Security Incidents", href: "/principal/operations/incidents" }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/principal/operations/gates")}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to Gate Activity
        </button>
        <Link
          href="/sysadmin/gates"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-action-primary hover:bg-bg-elevated"
        >
          Establish / Configure Gates (SysAdmin)
          <ExternalLink className="size-3.5" />
        </Link>
      </div>

      {loading && !gate ? (
        <Loading />
      ) : !gate ? (
        <div className="surface-card p-6 text-center space-y-2">
          <p className="text-sm font-medium text-text-primary">Gate metrics unavailable</p>
          <p className="text-xs text-text-muted">
            Gate {gateId} could not be loaded or has no recent telemetry.
          </p>
        </div>
      ) : (
        <>
          <PageHeader
            title={`${gate.gateName} (${gate.gateCode})`}
            subtitle={`${gate.location} · ${verif.mode}`}
          />

          {rules && (
            <div className="surface-card bg-bg-elevated/40 p-3.5 flex items-start gap-2.5">
              <ShieldCheck className="size-4 text-action-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-text-primary">{rules.tierLabel}</p>
                <p className="text-xs text-text-secondary">{rules.whyRoleIsHere}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Status" value={gate.status} tone={gate.status === "ACTIVE" ? "ok" : "warn"} />
            <KpiCard label="Scans Today" value={gate.scansToday ?? 0} />
            <KpiCard label="Entries (IN)" value={gate.entriesToday ?? 0} tone="ok" />
            <KpiCard label="Exits (OUT)" value={gate.exitsToday ?? 0} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="surface-card p-4 space-y-2">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Radio className="size-4 text-action-primary" />
                Verification &amp; Perimeter Setup
              </h2>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-text-muted">Verification Type</dt>
                  <dd className="font-medium text-text-primary mt-0.5">{verif.mode}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Gate Type</dt>
                  <dd className="font-mono text-text-primary mt-0.5">{gate.type}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Location</dt>
                  <dd className="text-text-primary mt-0.5 flex items-center gap-1">
                    <MapPin className="size-3 text-text-muted" />
                    {gate.location}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Peak Hour</dt>
                  <dd className="text-text-primary mt-0.5 flex items-center gap-1">
                    <Clock className="size-3 text-text-muted" />
                    {gate.peakHour ?? "—"}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-text-muted pt-1">{verif.detail}</p>
            </section>

            <section className="surface-card p-4 space-y-2">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4 text-action-primary" />
                Active Operator on Post
              </h2>
              {gate.activeOperator ? (
                <div className="text-xs space-y-1">
                  <p className="font-medium text-text-primary">{gate.activeOperator.name}</p>
                  <p className="text-text-muted">{gate.activeOperator.email ?? "—"}</p>
                  <p className="text-text-muted">
                    On post since {new Date(gate.activeOperator.since).toLocaleString("en-IN")}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-text-muted">No operator currently claimed on this gate.</p>
              )}
            </section>
          </div>

          <section className="surface-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Recent Scans ({gate.recentScans.length})</h2>
            <DataTable
              data={gate.recentScans}
              keyExtractor={(r) => r.id}
              emptyMessage="No recent scans recorded at this gate."
              columns={[
                { header: "Person", accessor: (r) => r.personName },
                { header: "Role", accessor: (r) => r.personRole },
                { header: "Direction", accessor: (r) => <span className="font-mono font-semibold">{r.direction}</span> },
                {
                  header: "Reason / Ref",
                  accessor: (r) =>
                    r.reason ? (
                      <SmartTextRef text={r.reason} currentPath={`/principal/operations/gates/${gateId}`} />
                    ) : (
                      "—"
                    ),
                },
                { header: "Operator", accessor: (r) => r.operator ?? "—" },
                { header: "Time", accessor: (r) => new Date(r.timestamp).toLocaleString("en-IN") },
              ]}
            />
          </section>
        </>
      )}
    </div>
  );
}
