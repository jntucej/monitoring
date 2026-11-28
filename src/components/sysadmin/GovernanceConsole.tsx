"use client";

/**
 * GovernanceConsole — Module 3: the HOD / OIE / Principal governance surface.
 *
 * 1. Policy Linter — run the linter against any of the 4 versioned domains.
 * 2. Dry-Run Impact Preview — read-only per-domain delta before publish.
 * 3. Regulation Cloning — two-person gated clone (principal + sysadmin quorum).
 * 4. Two-Person Step-Up Quorum — the publish step requires a second approver
 *    AND a fresh step-up (< 5 min) + attached dry-run summary.
 *
 * All reads come from /api/sysadmin/policy-console; the clone write comes
 * from /api/sysadmin/regulation/clone. The StepUpModal (existing) stamps
 * sessions.step_up_at — the publish API rejects a stale step-up server-side.
 */
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ShieldCheck,
  FlaskConical,
  GitBranch,
  Lock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useCatalog } from "@/hooks/useCatalog";
import { getAuthHeaders } from "@/lib/utils";

type TabValue = "linter" | "dryrun" | "clone" | "quorum";

export function GovernanceConsole() {
  const { catalog } = useCatalog();
  const [tab, setTab] = useState<TabValue>("linter");

  // Linter state
  const [lintDomain, setLintDomain] = useState<string>("routing_policies");
  const [lintRow, setLintRow] = useState<string>("");
  const [lintResult, setLintResult] = useState<{ clean: boolean; violations: unknown[] } | null>(null);
  const [lintLoading, setLintLoading] = useState(false);

  // Dry-run state
  const [dryDomain, setDryDomain] = useState<string>("governance_matrix");
  const [dryRow, setDryRow] = useState<string>("");
  const [dryResult, setDryResult] = useState<Record<string, unknown> | null>(null);
  const [dryLoading, setDryLoading] = useState(false);

  // Clone state
  const [cloneSource, setCloneSource] = useState("");
  const [cloneTarget, setCloneTarget] = useState("");
  const [cloneApprover, setCloneApprover] = useState("");
  const [cloneResult, setCloneResult] = useState<Record<string, unknown> | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [cloneLoading, setCloneLoading] = useState(false);

  const domains = ["routing_policies", "governance_matrix", "retention_policy_rules", "spatial_policies"];

  const activeRegulations = catalog?.activeRegulations ?? [];

  const runLinter = async () => {
    setLintLoading(true); setLintResult(null);
    try {
      const res = await fetch("/api/sysadmin/policy-console", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ domain: lintDomain, rowId: lintRow, action: "linter-preview" }),
      });
      const json = await res.json();
      setLintResult(json.success ? { clean: json.data?.clean ?? false, violations: json.data?.violations ?? [] } : { clean: false, violations: [{ error: json.error?.message }] });
    } catch (e) {
      setLintResult({ clean: false, violations: [{ error: e instanceof Error ? e.message : "Error" }] });
    }
    setLintLoading(false);
  };

  const runDryRun = async () => {
    setDryLoading(true); setDryResult(null);
    try {
      const res = await fetch("/api/sysadmin/policy-console", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ domain: dryDomain, rowId: dryRow, action: "dry-run" }),
      });
      const json = await res.json();
      setDryResult(json.success ? json.data?.dryRun ?? json.data : json.error?.message ? { error: json.error.message } : json);
    } catch (e) {
      setDryResult({ error: e instanceof Error ? e.message : "Error" });
    }
    setDryLoading(false);
  };

  const runClone = async () => {
    setCloneLoading(true); setCloneError(null); setCloneResult(null);
    try {
      const res = await fetch("/api/sysadmin/regulation/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          sourceCode: cloneSource,
          newCode: cloneTarget,
          secondApproverId: cloneApprover,
          dryRunSummary: { generatedAt: new Date().toISOString(), note: "manual clone" },
        }),
      });
      const json = await res.json();
      if (json.success) setCloneResult(json.data);
      else setCloneError(json.error?.message ?? "Clone failed");
    } catch (e) {
      setCloneError(e instanceof Error ? e.message : "Error");
    }
    setCloneLoading(false);
  };

  const tabs: Array<{ val: TabValue; label: string; icon: React.ReactNode }> = [
    { val: "linter", label: "Linter", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { val: "dryrun", label: "Dry-Run", icon: <FlaskConical className="h-3.5 w-3.5" /> },
    { val: "clone", label: "Clone", icon: <GitBranch className="h-3.5 w-3.5" /> },
    { val: "quorum", label: "Quorum", icon: <Lock className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-text-primary">Governance Console</h1>
        <Badge variant="entry" dot={false}>sysadmin · principal · oie</Badge>
      </div>

      {/* Tab pills */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.val}
            onClick={() => setTab(t.val)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.val ? "bg-sky-600 text-white" : "bg-bg-elevated text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Linter ─────────────────────────────────────────────── */}
      {tab === "linter" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Policy Linter Preview</CardTitle>
            <p className="text-xs text-text-secondary">
              Run the pre-activation linter against a specific row. Violations block the DRAFT → DRY_RUN_VERIFIED transition.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  aria-label="Domain"
                  value={lintDomain}
                  onChange={(v) => { setLintDomain(v); setLintRow(""); setLintResult(null); }}
                  options={domains.map((d) => ({ value: d, label: d }))}
                />
                <Input aria-label="Row UUID" placeholder="Row UUID (from Policy Console)" value={lintRow} onChange={(e) => setLintRow(e.target.value)} />
              </div>
              <Button variant="primary" size="sm" onClick={runLinter} disabled={!lintRow || lintLoading}>
                {lintLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Run Linter
              </Button>
              {lintResult && (
                <div className={`rounded-lg border p-3 text-sm ${lintResult.clean ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800" : "border-rose-500/30 bg-rose-500/10 text-rose-800"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {lintResult.clean ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <span className="font-medium">{lintResult.clean ? "Clean" : "Violations found"}</span>
                  </div>
                  {(!lintResult.clean || (lintResult.violations?.length ?? 0) > 0) && (
                    <pre className="mt-1 text-xs overflow-x-auto">{JSON.stringify(lintResult.violations, null, 2)}</pre>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Dry-Run ────────────────────────────────────────────── */}
      {tab === "dryrun" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dry-Run Impact Preview</CardTitle>
            <p className="text-xs text-text-secondary">
              Read-only delta. Attach the summary to the publish step — the API rejects a publish without it.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  aria-label="Domain"
                  value={dryDomain}
                  onChange={(v) => { setDryDomain(v); setDryRow(""); setDryResult(null); }}
                  options={domains.map((d) => ({ value: d, label: d }))}
                />
                <Input aria-label="Row UUID" placeholder="Row UUID" value={dryRow} onChange={(e) => setDryRow(e.target.value)} />
              </div>
              <Button variant="primary" size="sm" onClick={runDryRun} disabled={!dryRow || dryLoading}>
                {dryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Run Dry-Run
              </Button>
              {dryResult && (
                <pre className="mt-2 rounded-lg border border-border bg-bg-elevated p-3 text-xs overflow-x-auto">
                  {JSON.stringify(dryResult, null, 2)}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Clone ──────────────────────────────────────────────── */}
      {tab === "clone" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-4 w-4 text-text-secondary" />
              Regulation Clone
            </CardTitle>
            <p className="text-xs text-text-secondary">
              Two-person gated: the second approver must be <code>principal</code> or <code>sysadmin</code>. The clone lands as DRAFT.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  aria-label="Source regulation"
                  placeholder="Source"
                  value={cloneSource}
                  onChange={setCloneSource}
                  options={activeRegulations.map((r) => ({ value: r.code, label: `${r.code} v${r.version}` }))}
                />
                <Input aria-label="New code" placeholder="New code (e.g. R30)" value={cloneTarget} onChange={(e) => setCloneTarget(e.target.value)} />
                <Input aria-label="Second approver UUID" placeholder="Second approver UUID" value={cloneApprover} onChange={(e) => setCloneApprover(e.target.value)} />
              </div>
              <Button variant="primary" size="sm" onClick={runClone} disabled={!cloneSource || !cloneTarget || !cloneApprover || cloneLoading}>
                {cloneLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Clone (two-person)
              </Button>
              {cloneError && <p className="text-sm text-rose-600">{cloneError}</p>}
              {cloneResult && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800">
                  Cloned <code>{cloneSource}</code> → <code>{cloneTarget}</code> (v{String(cloneResult.version)} DRAFT). Publish via Policy Console.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quorum explainer ───────────────────────────────────── */}
      {tab === "quorum" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-text-secondary" />
              Two-Person Step-Up Quorum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm text-text-secondary">
              <li>1. Draft the change (any of the 4 domains) → <Badge variant="entry" dot={false}>DRAFT</Badge></li>
              <li>2. Run Linter Preview → <Badge variant="entry" dot={false}>Clean</Badge></li>
              <li>3. Run Dry-Run Impact → attach the summary</li>
              <li>4. Two-Person: <code>approvedBy</code> must differ from the actor</li>
              <li>5. Step-Up: re-enter password within 5 min (stamps <code>sessions.step_up_at</code>)</li>
              <li>6. Publish → <Badge variant="success" dot={false}>ACTIVE</Badge></li>
            </ul>
            <p className="mt-3 text-xs text-text-secondary">
              The governance_matrix meta-rule trigger is the DB backstop: a downgrade of a two-person action
              requires a recorded <code>principal</code> + <code>sysadmin</code> quorum, else the trigger rejects it.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
