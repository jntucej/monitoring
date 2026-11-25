"use client";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { PageHeader } from "@/components/principal/shared/PrincipalPageHeader";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { PageLoading as Loading } from "@/components/principal/shared/PrincipalLoadingStates";
import {
  EntityInspector,
  KVPairs,
  Timeline,
  InspectorButton,
} from "@/components/shared/EntityInspector";
import { ChevronRight, ExternalLink } from "lucide-react";
import { useRoleContext } from "@/hooks/useRoleContext";
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
  CRITICAL: "bg-red-500/10 text-red-600",
  HIGH: "bg-rose-500/10 text-rose-600",
  MEDIUM: "bg-amber-500/10 text-amber-600",
  LOW: "bg-blue-500/10 text-blue-600",
  NONE: "bg-bg-elevated text-text-muted",
};

/**
 * /principal/cases — the institutional case register, with the standardized
 * inspection experience: click a case → drawer (overview → risk & authority
 * → timeline → actions) without leaving the register.
 */
export default function PrincipalCasesPage() {
  const { data, loading } = useApiResource<{ success: boolean; data: { cases: CaseRow[]; total: number } }>(
    "/api/cases?limit=100",
    { ttlMs: 15_000 },
  );
  const rows = (data?.data?.cases ?? [])
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const [active, setActive] = useState<CaseRow | null>(null);
  const role = useRoleContext();

  /** Standardized inspection model for an institutional case. */
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
                  {
                    label: "Scope",
                    value: active.entity_scope ?? "institution",
                  },
                ]}
              />
            ),
          },
          {
            title: "Risk & authority",
            content: (
              <KVPairs
                items={[
                  {
                    label: "Risk level",
                    value: (
                      <span className={`font-bold uppercase ${RISK_TONE[active.risk] ?? ""}`}>
                        {active.risk}
                      </span>
                    ),
                  },
                  { label: "Authority role", value: active.authority_role ?? "ladder" },
                  { label: "Authority context", value: active.authority_context ?? "—" },
                  ...(active.sla_due_at
                    ? [
                        {
                          label: "SLA due",
                          value: new Date(active.sla_due_at).toLocaleString("en-IN"),
                        },
                      ]
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
                {role.isPrincipal ? (
                  <>
                    <InspectorButton href="/principal/decisions" variant="primary">
                      <ExternalLink className="size-3.5" /> Decide
                    </InspectorButton>
                    <InspectorButton href="/principal/escalations" variant="ghost">
                      <ChevronRight className="size-3.5" /> Escalations
                    </InspectorButton>
                    <InspectorButton href="/principal/emergency" variant="ghost">
                      <ChevronRight className="size-3.5" /> Emergency state
                    </InspectorButton>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] text-text-muted">
                      Read-only view — acting on this case requires the {role.role ?? "principal"} role
                    </span>
                    <InspectorButton href="/principal/decisions" variant="ghost">
                      <ExternalLink className="size-3.5" /> Decision ledger
                    </InspectorButton>
                  </>
                )}
              </div>
            ),
          },
        ],
      }
    : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Case Register"
        subtitle="Institutional cases — click any case to inspect it in place"
      />
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Formal disciplinary, academic dishonesty, and institutional inquiry cases"
        why="Formal case tracking preserves forensic documentation, disciplinary evidence, and procedural integrity for serious campus matters."
        contextLabel="Institutional Case Register"
        statusSummary={rows.length > 0 ? `${rows.length} institutional cases on file; click any case to inspect evidentiary provenance.` : "No active institutional cases on file."}
        primaryAction={{ label: "Emergency Command", href: "/principal/emergency" }}
        secondaryAction={{ label: "Audit Ledger", href: "/principal/governance/audit" }}
      />
      {loading && <Loading />}
      {!loading && rows.length === 0 && (
        <EmptyState title="No cases" description="No institutional cases are open or recent." />
      )}
      {!loading && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((c) => (
            <article
              key={c.id}
              className="surface-card p-4 cursor-pointer hover:bg-bg-surface/60 transition-colors"
              onClick={() => setActive(c)}
            >
              <header className="flex items-center gap-2 flex-wrap">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    RISK_TONE[c.risk] ?? RISK_TONE.NONE
                  }`}
                >
                  {c.risk}
                </span>
                <h2 className="text-sm font-medium text-text-primary truncate">
                  {CASE_TYPE_LABEL[c.type] ?? c.type} · {c.ref}
                </h2>
                <span className="text-xs text-text-muted font-mono">
                  {c.subject_type} {c.subject_id}
                </span>
                <span
                  className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    c.state === "OPEN" || c.state === "CREATED"
                      ? "bg-action-primary/10 text-action-primary"
                      : "bg-bg-elevated text-text-muted"
                  }`}
                >
                  {c.state}
                </span>
              </header>
              <p className="mt-1 text-xs text-text-muted">
                {new Date(c.created_at).toLocaleString("en-IN")} · authority{" "}
                {c.authority_role ?? "ladder"}
                {c.authority_context ? ` (${c.authority_context})` : ""}
              </p>
            </article>
          ))}
        </div>
      )}

      <EntityInspector inspection={inspection} onClose={() => setActive(null)} />
    </div>
  );
}
