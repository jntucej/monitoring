"use client";

/**
 * PolicyDryRunDrawer — the two-panel Dry-Run gate the Principal MUST view
 * before publishing. Stacked:
 *   1. Policy Linter Checklist (Overlap / Cohort Coverage / Role Integrity —
 *      red blockers disable Publish).
 *   2. Dry-Run Impact Delta (before vs after student/record counts +
 *      Prospective vs Retroactive override toggle).
 *
 * Zero hardcoding: it POSTs to /api/principal/policy/lint-and-dryrun and
 * renders whatever the live linter + json-logic dry-run return. No mock
 * store — the numbers come from the real attendance cohort.
 */
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, type Column } from "@/components/ui/table";
import { Shield, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { invalidateApiCache } from "@/hooks/useApiResource";

export interface LintResult {
  key: string;
  domain: string;
  issues: Array<{ code: string; message: string; blocking: boolean }>;
  blockingIssues: number;
  dryRun: {
    before: number;
    after: number;
    shifted: number;
    note: string;
    transitions: Record<string, number>;
  };
  verified: boolean;
  transitioned: string;
}

export interface PolicyDryRunDrawerProps {
  open: boolean;
  onClose: () => void;
  /** domain + key of the policy to lint + dry-run. */
  domain: string;
  key: string;
  /** Optional JSONLogic tree for the dry-run delta. */
  jsonLogic?: Record<string, unknown>;
  onVerified?: (r: LintResult) => void;
}

export function PolicyDryRunDrawer({
  open,
  onClose,
  domain,
  key,
  jsonLogic,
  onVerified,
}: PolicyDryRunDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LintResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const blockers = result?.issues.filter((i) => i.blocking) ?? [];
  const nonBlockers = result?.issues.filter((i) => !i.blocking) ?? [];

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/principal/policy/lint-and-dryrun", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ domain, key, jsonLogic }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
      setResult(json.data as LintResult);
      onVerified?.(json.data as LintResult);
      invalidateApiCache(["/api/principal/state"]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  interface DeltaRow {
    transition: string;
    count: number;
  }
  const deltaCols: Column<DeltaRow>[] = result
    ? [
        { key: "transition", header: "Status transition", render: (row) => <code className="text-[11px]">{row.transition}</code> },
        { key: "count", header: "Students affected", render: (row) => <span className="tabular-nums">{row.count}</span> },
      ]
    : [];

  return (
    <Drawer isOpen={open} onClose={onClose} title={`Lint & Dry-Run · ${key}`} placement="right">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="entry"><Clock className="mr-1 size-3" /> {domain}</Badge>
          <Button size="sm" variant="secondary" isPending={loading} onPress={run}>
            <Shield className="size-4" /> Run Linter + Dry-Run
          </Button>
        </div>

        {error && <div className="rounded-md border border-action-danger/40 bg-action-danger/10 p-3 text-xs text-action-danger">{error}</div>}

        {/* Panel 1: Linter checklist */}
        {result && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-text-secondary">Policy Linter</h4>
            {blockers.length === 0 && nonBlockers.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-action-primary/40 bg-action-primary/10 p-3 text-xs text-action-primary">
                <CheckCircle2 className="size-4" /> No linter issues — cleared for publish.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {blockers.map((i, idx) => (
                  <li key={`b${idx}`} className="flex items-start gap-2 text-xs">
                    <XCircle className="mt-0.5 size-4 shrink-0 text-action-danger" />
                    <span className="text-action-danger"><strong>{i.code}</strong> — {i.message} <em>(blocks publish)</em></span>
                  </li>
                ))}
                {nonBlockers.map((i, idx) => (
                  <li key={`n${idx}`} className="flex items-start gap-2 text-xs">
                    <Clock className="mt-0.5 size-4 shrink-0 text-action-warning" />
                    <span className="text-action-warning">{i.message} <em>(advisory)</em></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Panel 2: Dry-Run impact delta */}
        {result && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-text-secondary">Dry-Run Impact Delta</h4>
            <div className="rounded-md border border-border bg-bg-base p-3 text-xs">
              <p className="mb-1">{result.dryRun.note}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="entry">Before {result.dryRun.before}</Badge>
                <Badge variant="dayout">After {result.dryRun.after}</Badge>
                <Badge variant={result.dryRun.shifted > 0 ? "error" : "success"}>{result.dryRun.shifted} shifted</Badge>
              </div>
              {Object.keys(result.dryRun.transitions).length > 0 && (
                <div className="mt-3">
                  <Table columns={deltaCols} data={Object.entries(result.dryRun.transitions).map(([transition, count]) => ({ transition, count }))} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={result.verified ? "success" : "error"}>
                {result.verified ? "DRY_RUN_VERIFIED" : "BLOCKED"}
              </Badge>
              <span className="text-xs text-text-secondary">{result.transitioned === "BLOCKED" ? "Publish disabled until blockers clear." : "Ready for Step-Up publish."}</span>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
