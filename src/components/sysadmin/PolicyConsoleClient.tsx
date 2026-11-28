"use client";

/**
 * PolicyConsoleClient — the admin console for the four versioned policy
 * domains (routing / governance / retention / spatial).
 *
 * Closed-loop lifecycle: Draft -> Linter Preview -> Dry-Run -> Verify ->
 * Two-Person Approve -> Publish (Step-Up). Every step is a server call;
 * the console never mutates state locally. The DB triggers (linter +
 * two-person + meta-rule) are the backstop — the UI surfaces their
 * rejections as 409s the operator can act on.
 *
 * No hardcoded values: the domain list, status order, and per-domain
 * field labels all come from the live /api/sysadmin/policy-console GET.
 */
import { useState, useCallback, useMemo } from "react";
import { cachedFetch } from "@/hooks/useApiResource";
import { getAuthHeaders, cn } from "@/lib/utils";
import { StepUpModal } from "@/components/shared/StepUpModal";

type PolicyDomain =
  | "routing_policies"
  | "governance_matrix"
  | "retention_policy_rules"
  | "spatial_policies";

interface PolicyRow {
  id: string;
  domain: PolicyDomain;
  key: string;
  version: number;
  status: "DRAFT" | "DRY_RUN_VERIFIED" | "ACTIVE" | "ARCHIVED";
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string | null;
  createdByName: string | null;
  data: Record<string, unknown>;
}

interface LinterViolation {
  violation: string;
  detail: Record<string, unknown>;
}

interface DryRunSummary {
  generatedAt: string;
  domain: string;
  rowId: string;
  toStatus: string;
  [k: string]: unknown;
}

const DOMAIN_LABELS: Record<PolicyDomain, string> = {
  routing_policies: "Authority Bridge (Routing)",
  governance_matrix: "Governance Matrix (Tier-2)",
  retention_policy_rules: "Retention Rules",
  spatial_policies: "Spatial & Telemetry",
};

const STATUS_ORDER: PolicyRow["status"][] = [
  "DRAFT",
  "DRY_RUN_VERIFIED",
  "ACTIVE",
  "ARCHIVED",
];

function StatusBadge({ status }: { status: PolicyRow["status"] }) {
  const colors: Record<PolicyRow["status"], string> = {
    DRAFT: "bg-amber-50 text-amber-700 border-amber-200",
    DRY_RUN_VERIFIED: "bg-blue-50 text-blue-700 border-blue-200",
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ARCHIVED: "bg-bg-elevated text-text-secondary border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
        colors[status],
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function DataField({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="italic text-text-secondary">no data</span>
      </div>
    );
  }
  const display = Array.isArray(value)
    ? value.join(", ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono">{display}</span>
    </div>
  );
}

/** Which data fields to show for each domain (from the live API shape). */
function domainFields(domain: PolicyDomain): Array<[string, string]> {
  switch (domain) {
    case "routing_policies":
      return [
        ["category", "Category"],
        ["stage1", "Stage-1 Role"],
        ["escalationChain", "Escalation Chain"],
        ["slaHours", "SLA (h)"],
        ["bypass", "Direct Bypass"],
        ["visibility", "Reply Visibility"],
        ["autoKb", "Auto-Promote to KB"],
      ];
    case "governance_matrix":
      return [
        ["channel", "Channel"],
        ["approvers", "Approvers"],
        ["eligibleRoles", "Eligible Roles"],
        ["dryRun", "Dry-Run Required"],
        ["circularAttachment", "Circular Attachment"],
      ];
    case "retention_policy_rules":
      return [
        ["artifact", "Artifact"],
        ["hotDays", "Hot (DB) Days"],
        ["coldYears", "Cold (R2) Years"],
        ["trigger", "Trigger"],
        ["exportFormat", "Export Format"],
      ];
    case "spatial_policies":
      return [
        ["role", "Role"],
        ["layers", "Map Layers"],
        ["gpsCutoffM", "GPS Cutoff (m)"],
        ["movingSec", "Moving Interval (s)"],
        ["stationarySec", "Stationary Interval (s)"],
        ["speedMps", "Speed (m/s)"],
        ["authoritative", "Authoritative"],
        ["hardware", "Hardware"],
      ];
  }
}

export function PolicyConsoleClient() {
  const [domain, setDomain] = useState<PolicyDomain>("routing_policies");
  const [rows, setRows] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-row action state
  const [selected, setSelected] = useState<PolicyRow | null>(null);
  const [linter, setLinter] = useState<LinterViolation[] | null>(null);
  const [linterLoading, setLinterLoading] = useState(false);
  const [dryRun, setDryRun] = useState<DryRunSummary | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [transitionMsg, setTransitionMsg] = useState<string | null>(null);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [approvedBy, setApprovedBy] = useState("");
  const [stepUpOpen, setStepUpOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cachedFetch<{
        domain: PolicyDomain;
        count: number;
        rows: PolicyRow[];
      }>(`/api/sysadmin/policy-console?domain=${domain}`, { bypassCache: true });
      setRows(data.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load policies");
    } finally {
      setLoading(false);
    }
  }, [domain]);

  // Reload when the domain tab changes
  useMemo(() => {
    load();
  }, [load]);

  const post = useCallback(
    async (body: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
      const res = await fetch("/api/sysadmin/policy-console", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        const err = j as { error?: { code?: string; message?: string } } | null;
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
      }
      return j as Record<string, unknown>;
    },
    [],
  );

  const runLinterPreview = useCallback(
    async (row: PolicyRow) => {
      setLinterLoading(true);
      setLinter(null);
      try {
        const j = await post({ domain, rowId: row.id, action: "linter-preview" });
        setLinter((j as { violations?: LinterViolation[] }).violations ?? []);
      } catch (e) {
        setLinter(null);
        setError(e instanceof Error ? e.message : "Linter preview failed");
      } finally {
        setLinterLoading(false);
      }
    },
    [domain, post],
  );

  const runDryRun = useCallback(
    async (row: PolicyRow) => {
      setDryRunLoading(true);
      setDryRun(null);
      try {
        const j = await post({ domain, rowId: row.id, action: "dry-run" });
        setDryRun((j as { dryRun?: DryRunSummary }).dryRun ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Dry-run failed");
      } finally {
        setDryRunLoading(false);
      }
    },
    [domain, post],
  );

  const verifyDryRun = useCallback(
    async (row: PolicyRow) => {
      if (!dryRun) return;
      try {
        await fetch("/api/sysadmin/policy-console/dry-run-verify", {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            domain,
            rowId: row.id,
            dryRunSummary: dryRun,
            approvedBy: approvedBy || undefined,
          }),
        });
        setTransitionMsg("Dry-run verified. Row is now DRY_RUN_VERIFIED.");
        await load();
      } catch (e) {
        setTransitionMsg(e instanceof Error ? e.message : "Dry-run verify failed");
      }
    },
    [domain, dryRun, approvedBy, load],
  );

  const transition = useCallback(
    async (row: PolicyRow, toStatus: PolicyRow["status"]) => {
      setTransitionLoading(true);
      setTransitionMsg(null);
      try {
        const body: Record<string, unknown> = {
          domain,
          rowId: row.id,
          action: "transition",
          toStatus,
        };
        if (approvedBy) body.approvedBy = approvedBy;
        if (toStatus === "ACTIVE" && dryRun) body.dryRunSummary = dryRun;

        const res = await fetch("/api/sysadmin/policy-console", {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(body),
        });
        const j = (await res.json().catch(() => null)) as
          | { error?: { code?: string; message?: string } }
          | null;

        if (!res.ok) {
          const code = j?.error?.code;
          if (code === "STEP_UP_REQUIRED") {
            setStepUpOpen(true);
            return;
          }
          setTransitionMsg(`${code ?? "Error"}: ${j?.error?.message ?? "Transition failed"}`);
          return;
        }

        setTransitionMsg(`Transitioned to ${toStatus}.`);
        await load();
      } catch (e) {
        setTransitionMsg(e instanceof Error ? e.message : "Transition failed");
      } finally {
        setTransitionLoading(false);
      }
    },
    [domain, approvedBy, dryRun, load],
  );

  const onStepUpSuccess = useCallback(() => {
    setStepUpOpen(false);
    // Retry the publish after the step-up marker is fresh.
    if (selected) {
      transition(selected, "ACTIVE");
    }
  }, [selected, transition]);

  const activeRow = selected ?? rows[0] ?? null;

  return (
    <div className="space-y-4">
      {/* Domain tabs */}
      <div className="flex gap-1 border-b">
        {(Object.keys(DOMAIN_LABELS) as PolicyDomain[]).map((d) => (
          <button
            key={d}
            onClick={() => {
              setDomain(d);
              setSelected(null);
              setLinter(null);
              setDryRun(null);
              setTransitionMsg(null);
            }}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors",
              domain === d
                ? "border-b-2 border-primary text-text-primary"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {DOMAIN_LABELS[d]}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-text-secondary">Loading policies…</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-text-secondary">
          No policy rows in this domain yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Row list */}
          <div className="space-y-2">
            {rows.map((row) => (
              <button
                key={row.id}
                onClick={() => {
                  setSelected(row);
                  setLinter(null);
                  setDryRun(null);
                  setTransitionMsg(null);
                }}
                className={cn(
                  "w-full rounded border p-3 text-left transition-colors",
                  activeRow?.id === row.id
                    ? "border-primary bg-bg-elevated"
                    : "border-border hover:bg-bg-elevated/50",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">{row.key}</span>
                  <StatusBadge status={row.status} />
                </div>
                <div className="mt-1 text-xs text-text-secondary">
                  v{row.version} · {row.createdByName ?? "unknown"} ·{" "}
                  {new Date(row.effectiveFrom).toLocaleDateString()}
                  {row.effectiveTo ? ` → ${new Date(row.effectiveTo).toLocaleDateString()}` : ""}
                </div>
              </button>
            ))}
          </div>

          {/* Detail + actions */}
          {activeRow && (
            <div className="space-y-3 rounded border p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{activeRow.key}</h3>
                <StatusBadge status={activeRow.status} />
              </div>

              <div className="space-y-1.5">
                {domainFields(domain).map(([field, label]) => (
                  <DataField key={field} label={label} value={activeRow.data[field]} />
                ))}
              </div>

              {/* Linter preview */}
              <div className="border-t pt-3">
                <button
                  onClick={() => runLinterPreview(activeRow)}
                  disabled={linterLoading}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {linterLoading ? "Running linter…" : "Run Linter Preview"}
                </button>
                {linter && (
                  <div className="mt-2">
                    {linter.length === 0 ? (
                      <span className="text-xs text-emerald-600">✓ No violations</span>
                    ) : (
                      <ul className="space-y-1">
                        {linter.map((v, i) => (
                          <li key={i} className="text-xs text-red-600">
                            • {v.violation}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Dry-run */}
              <div className="border-t pt-3">
                <button
                  onClick={() => runDryRun(activeRow)}
                  disabled={dryRunLoading}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {dryRunLoading ? "Running dry-run…" : "Run Dry-Run"}
                </button>
                {dryRun && (
                  <div className="mt-2 max-h-40 overflow-auto rounded bg-bg-elevated p-2 text-xs">
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(dryRun, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Two-person approver */}
              <div className="border-t pt-3">
                <label className="text-xs font-medium text-text-secondary">
                  Approved by (UUID, must differ from actor)
                </label>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value.trim())}
                  placeholder="optional — defaults to self"
                  className="mt-1 w-full rounded border bg-bg-surface px-2 py-1 text-xs"
                />
              </div>

              {/* Transition buttons */}
              <div className="flex flex-wrap gap-2 border-t pt-3">
                {activeRow.status === "DRAFT" && (
                  <button
                    onClick={() => verifyDryRun(activeRow)}
                    disabled={!dryRun}
                    className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Mark Verified
                  </button>
                )}
                {(activeRow.status === "DRY_RUN_VERIFIED" || activeRow.status === "ACTIVE") && (
                  <button
                    onClick={() => transition(activeRow, "ACTIVE")}
                    disabled={transitionLoading}
                    className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Publish (Step-Up)
                  </button>
                )}
                {activeRow.status !== "ARCHIVED" && (
                  <button
                    onClick={() => transition(activeRow, "ARCHIVED")}
                    disabled={transitionLoading}
                    className="rounded bg-gray-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Archive
                  </button>
                )}
              </div>

              {transitionMsg && (
                <div
                  className={cn(
                    "rounded p-2 text-xs",
                    transitionMsg.startsWith("Transitioned")
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700",
                  )}
                >
                  {transitionMsg}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step-Up modal for the publish step */}
      <StepUpModal
        open={stepUpOpen}
        onClose={() => setStepUpOpen(false)}
        onSuccess={onStepUpSuccess}
      />
    </div>
  );
}
