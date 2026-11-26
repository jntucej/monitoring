"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useEntityInspector } from "@/components/shared/useEntityInspector";
import { EntityInspector, KVPairs, InspectorButton, type EntityInspection } from "@/components/shared/EntityInspector";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

interface ComplaintCategoryRow {
  code: string;
  label: string;
  ownerRole?: string;
  slaHours?: number;
}

/**
 * One escalation step of a category's complaint_escalation_chains row, as
 * read back from the /api/complaints category payload when it is present.
 */
interface EscalationStepRow {
  position: number;
  role: string;
  slaHours?: number;
  autoEscalateOnBreach?: boolean;
}

/**
 * ChainsPage — complaint escalation chains register.
 *
 * Rows are complaint CATEGORIES (the complaint_escalation_chains seed), not
 * individual complaints: each row carries code/label/owner/SLA. The task's
 * "complaint" kind resolver (/api/complaints/:id) is for individual
 * complaint records, so category rows get an inline EntityInspection with
 * KVPairs built from the row data already loaded by /api/admin/complaint-categories
 * (escalation-chain steps are included when the payload carries them).
 * Individual complaints remain inspectable via the "complaint" resolver on
 * the complaint detail pages.
 */
export default function ChainsPage() {
  const [rows, setRows] = useState<ComplaintCategoryRow[]>([]);
  /** Per-category escalation-chain steps, loaded alongside when available. */
  const [chains, setChains] = useState<Record<string, EscalationStepRow[]>>({});
  const { inspection, inspect, closeInspection } = useEntityInspector();

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/complaint-categories", { headers: getAuthHeaders() });
    const j = await r.json();
    setRows(j.data?.categories ?? []);
    if (j.data?.chains) setChains(j.data.chains as Record<string, EscalationStepRow[]>);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  // Inline entity inspection from the category row + its chain steps — no
  // extra fetch needed (the row data is already loaded).
  const buildChainInspection = (c: ComplaintCategoryRow): EntityInspection => {
    const steps = chains[c.code] ?? [];
    const overview: Array<{ label: string; value: React.ReactNode }> = [
      { label: "Code", value: <code className="font-mono">{c.code}</code> },
      { label: "Label", value: c.label },
      { label: "Primary owner", value: c.ownerRole ?? "—" },
      { label: "SLA (h)", value: String(c.slaHours ?? "—") },
    ];
    const sections: EntityInspection["sections"] = [
      { title: "Overview", content: <KVPairs items={overview} /> },
    ];
    if (steps.length > 0) {
      sections.push({
        title: "Escalation chain",
        collapsible: true,
        content: (
          <KVPairs
            items={steps.map((s) => ({
              label: `Step ${s.position} · ${s.role}`,
              value: [
                s.slaHours != null ? `SLA ${s.slaHours}h` : null,
                s.autoEscalateOnBreach ? "auto-escalates on breach" : null,
              ].filter(Boolean).join(" · ") || "—",
            }))}
          />
        ),
      });
    } else {
      sections.push({
        title: "Escalation chain",
        content: (
          <p className="text-xs text-text-muted">
            Escalation chains are system-managed. Contact your IT / Platform Team to request routing changes.
          </p>
        ),
      });
    }
    sections.push({
      title: "Actions",
      content: (
        <div className="flex flex-wrap gap-2">
          <InspectorButton href="/admin/cases" variant="ghost">All cases</InspectorButton>
          <InspectorButton href="/admin/complaints/categories" variant="ghost">Category settings</InspectorButton>
        </div>
      ),
    });
    return {
      kind: "complaint",
      title: c.label,
      subtitle: c.code,
      status: (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-bg-elevated text-text-muted border border-border">
          SEED
        </span>
      ),
      sections,
      detailHref: "/admin/cases",
      detailLabel: "Complaints console",
    };
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Manage and monitor complaints chains for campus operations."
        why="The chain here defines the real-time status students see under their open complaint tickets."
        contextLabel="Complaints Chains"
        statusSummary="Review current complaints chains state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
      <h1 className="text-2xl font-semibold">Complaint escalation chains</h1>
      <p className="text-sm text-text-muted">
        Escalation chains are system-managed. Contact your IT / Platform Team to request routing changes.
      </p>
      <div className="border rounded bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b bg-bg-elevated">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Label</th>
              <th className="p-3">Primary Owner</th>
              <th className="p-3">SLA (h)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => (
              <tr key={c.code} className="cursor-pointer hover:bg-bg-elevated transition-colors" onClick={() => inspect(buildChainInspection(c))}>
                <td className="p-3 font-mono">{c.code}</td>
                <td className="p-3 font-medium">{c.label}</td>
                <td className="p-3 font-mono text-text-muted">{c.ownerRole}</td>
                <td className="p-3">{c.slaHours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EntityInspector inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
