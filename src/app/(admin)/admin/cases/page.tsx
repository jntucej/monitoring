"use client";
import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EntityInspector,
  KVPairs,
  Timeline,
  InspectorButton,
} from "@/components/shared/EntityInspector";
import { ExternalLink, ChevronRight } from "lucide-react";
import type { CaseRow } from "@/lib/institutional/cases";

const CASE_TYPE_LABEL: Record<string, string> = {
  gate_pass: "Gate pass",
  hostel_leave: "Hostel leave",
  hostel_discipline: "Hostel discipline",
  academic_status: "Academic status",
  exam_integrity: "Exam integrity",
  complaint: "Complaint",
  security_incident: "Security incident",
  emergency: "Emergency",
  delegation: "Delegation",
  mess: "Mess",
  medical: "Medical",
};

const RISK_TONE: Record<string, string> = {
  CRITICAL: "bg-red-500/10 text-action-danger",
  HIGH: "bg-rose-500/10 text-action-danger",
  MEDIUM: "bg-amber-500/10 text-action-warning",
  LOW: "bg-blue-500/10 text-action-primary",
  NONE: "bg-bg-elevated text-text-muted",
};

/**
 * /admin/cases — the institutional case register (admin view).
 *
 * The admin sees the same cases the principal sees (the institutional
 * layer is shared), but the Actions section is role-appropriate: the
 * admin links to the audit trail + escalations rather than resolving
 * (resolution is a principal verb under the emergency_command context).
 */
export default function AdminCasesPage() {
  const { data, loading, error } = useApiResource<{ success: boolean; data: { cases: CaseRow[]; total: number } }>(
    "/api/cases?limit=100",
    { ttlMs: 30_000 },
  );
  const rows = (data?.data?.cases ?? [])
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const [active, setActive] = useState<CaseRow | null>(null);

  const inspection = active
    ? {
        kind: "case",
        title: `${CASE_TYPE_LABEL[active.type] ?? active.type} · ${active.ref}`,
        subtitle: `${active.subject_type} ${active.subject_id}`,
        status: (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              RISK_TONE[active.risk] ?? RISK_TONE.NONE
            }`}
          >
            {active.risk}
          </span>
        ),
        sections: [
          {
            title: "Overview",
            content: (
              <KVPairs
                items={[
                  { label: "Type", value: CASE_TYPE_LABEL[active.type] ?? active.type },
                  { label: "State", value: <span className="font-mono">{active.state}</span> },
                  {
                    label: "Subject",
                    value: (
                      <span className="font-mono text-xs">
                        {active.subject_type} · {active.subject_id}
                      </span>
                    ),
                  },
                  { label: "Origin", value: active.origin ?? "system" },
                  { label: "Scope", value: active.entity_scope ?? "institution" },
                ]}
              />
            ),
          },
          {
            title: "Risk & authority",
            content: (
              <KVPairs
                items={[
                  { label: "Risk level", value: <span className="font-bold uppercase">{active.risk}</span> },
                  { label: "Authority role", value: active.authority_role ?? "ladder" },
                  { label: "Authority context", value: active.authority_context ?? "—" },
                  ...(active.sla_due_at
                    ? [{ label: "SLA due", value: new Date(active.sla_due_at).toLocaleString("en-IN") }]
                    : []),
                ]}
              />
            ),
          },
          {
            title: "Timeline",
            collapsible: true,
            content: (
              <Timeline
                items={[
                  {
                    label: active.created_by ? `Opened by ${active.created_by}` : "Case opened",
                    time: new Date(active.created_at).toLocaleString("en-IN"),
                    tone: "neutral",
                  },
                  ...(active.resolved_at
                    ? [
                        {
                          label: active.resolved_by ? `Resolved by ${active.resolved_by}` : "Resolved",
                          time: new Date(active.resolved_at).toLocaleString("en-IN"),
                          tone: "ok" as const,
                        },
                      ]
                    : []),
                ]}
              />
            ),
          },
          {
            title: "Payload",
            collapsible: true,
            content: (
              <pre className="text-[11px] font-mono text-text-muted whitespace-pre-wrap break-all">
                {JSON.stringify(active.payload ?? {}, null, 2)}
              </pre>
            ),
          },
          {
            title: "Actions",
            content: (
              <div className="flex flex-wrap gap-2">
                <InspectorButton href="/admin/audit-logs" variant="ghost">
                  <ExternalLink className="size-3.5" /> Audit trail
                </InspectorButton>
                <InspectorButton
                  href={`/admin/students/${active.subject_id}`}
                  variant="ghost"
                  disabled={active.subject_type !== "student"}
                >
                  <ChevronRight className="size-3.5" /> Subject record
                </InspectorButton>
              </div>
            ),
          },
        ],
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-4 md:py-6">
      <PageHeader
        title="Institutional Cases"
        subtitle="The case register behind the institutional decision architecture"
      />
      {error && (
        <div className="surface-card p-3 text-sm text-action-danger">{String(error)}</div>
      )}
      {loading && <Skeleton className="h-40 rounded-card" />}
      {!loading && rows.length === 0 && (
        <WidgetBoundary title="Cases">
          <p className="text-sm text-text-muted p-4">No institutional cases recorded.</p>
        </WidgetBoundary>
      )}
      {!loading && rows.length > 0 && (
        <WidgetBoundary title={`Cases (${rows.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-muted uppercase tracking-wide">
                  <th className="p-3">Ref</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">State</th>
                  <th className="p-3">Risk</th>
                  <th className="p-3">Authority</th>
                  <th className="p-3">Opened</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-border cursor-pointer hover:bg-bg-surface/40 transition-colors"
                    onClick={() => setActive(c)}
                  >
                    <td className="p-3 font-mono">{c.ref}</td>
                    <td className="p-3">{CASE_TYPE_LABEL[c.type] ?? c.type}</td>
                    <td className="p-3 font-mono">
                      {c.subject_type} {c.subject_id}
                    </td>
                    <td className="p-3">{c.state}</td>
                    <td className="p-3">
                      <span
                        className={`rounded px-1.5 py-0.5 font-bold uppercase ${
                          RISK_TONE[c.risk] ?? RISK_TONE.NONE
                        }`}
                      >
                        {c.risk}
                      </span>
                    </td>
                    <td className="p-3 text-text-muted">
                      {c.authority_role ?? "ladder"}
                      {c.authority_context ? ` (${c.authority_context})` : ""}
                    </td>
                    <td className="p-3 text-text-muted">
                      {new Date(c.created_at).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WidgetBoundary>
      )}

      <EntityInspector inspection={inspection} onClose={() => setActive(null)} />
    </div>
  );
}
