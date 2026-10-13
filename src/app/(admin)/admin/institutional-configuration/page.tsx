"use client";

import { useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {
  Building2,
  ScrollText,
  Timer,
  Settings,
  Database,
  ShieldCheck,
  UserCog,
  Lock,
} from "lucide-react";
import { Suspense } from "react";

/* ── response shape (mirrors /api/admin/institutional-configuration) ──────── */

interface PassType {
  code: string;
  name: string;
  requires_approval: boolean;
  approval_flow: string | null;
  is_active: boolean;
}

interface ExitReason {
  code: string;
  name: string;
  is_active: boolean;
}

interface RetentionPolicy {
  id: string;
  data_category: string;
  retention_days: number;
  auto_delete: boolean;
}

interface SystemSetting {
  id: string;
  value: unknown;
  updated_at: string;
}

interface InstitutionalData {
  pass_types: PassType[];
  exit_reasons: ExitReason[];
  retention_policies: RetentionPolicy[];
  system_settings: SystemSetting[];
  role_policy: { code: string; display_name: string; permissions: unknown; is_active: boolean }[];
  college: { name: string | null; short_name: string | null; accreditation: string | null } | null;
  note?: string;
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent ? "bg-emerald-500/[0.07] border-emerald-500/25" : "bg-[#0d1220] border-slate-800"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <div className={`mt-1.5 text-xl font-black tabular-nums ${accent ? "text-emerald-400" : "text-white"}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function ConfigRow({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-800/60 last:border-0">
      <span className="text-xs text-slate-400 shrink-0 w-40">{label}</span>
      <span className={`text-xs font-medium text-right break-words ${muted ? "text-slate-500" : "text-slate-200"}`}>
        {value}
      </span>
    </div>
  );
}

function AdminInstitutionalConfigurationInner() {
  const res = useApiResource<InstitutionalData>("/api/admin/institutional-configuration", { ttlMs: 30_000 });

  usePolling(
    () => {
      clearCache("/api/admin/institutional-configuration");
      return res.refresh();
    },
    { intervalMs: 120_000 }
  );

  const d = res.data;
  const loading = res.loading && !d;

  const passTypes = useMemo(() => d?.pass_types ?? [], [d]);
  const activePassTypes = useMemo(() => passTypes.filter((p) => p.is_active), [passTypes]);
  const activeReasons = useMemo(
    () => (d?.exit_reasons ?? []).filter((r) => r.is_active),
    [d]
  );

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <WidgetBoundary title="Institution">
          <KpiCard
            label="Institution"
            value={loading ? "…" : (d?.college?.short_name || d?.college?.name || "—")}
            sub={d?.college?.accreditation || "Institutional profile"}
            icon={<Building2 className="w-3.5 h-3.5 text-emerald-400" />}
            accent
          />
        </WidgetBoundary>

        <WidgetBoundary title="Active Pass Types">
          <KpiCard
            label="Active Pass Types"
            value={loading ? "…" : activePassTypes.length}
            sub={`${activePassTypes.filter((p) => p.requires_approval).length} require approval`}
            icon={<ShieldCheck className="w-3.5 h-3.5 text-blue-400" />}
          />
        </WidgetBoundary>

        <WidgetBoundary title="Exit Reasons">
          <KpiCard
            label="Active Exit Reasons"
            value={loading ? "…" : activeReasons.length}
            sub="Configured exit categories"
            icon={<ScrollText className="w-3.5 h-3.5 text-amber-400" />}
          />
        </WidgetBoundary>

        <WidgetBoundary title="Retention">
          <KpiCard
            label="Retention Policies"
            value={loading ? "…" : (d?.retention_policies?.length ?? 0)}
            sub="Data categories under policy"
            icon={<Timer className="w-3.5 h-3.5 text-purple-400" />}
          />
        </WidgetBoundary>

        <WidgetBoundary title="Role Policy">
          <KpiCard
            label="Role Policy Entries"
            value={loading ? "…" : (d?.role_policy?.length ?? 0)}
            sub="Active role definitions"
            icon={<UserCog className="w-3.5 h-3.5 text-pink-400" />}
          />
        </WidgetBoundary>

        <WidgetBoundary title="System Settings">
          <KpiCard
            label="System Settings Keys"
            value={loading ? "…" : (d?.system_settings?.length ?? 0)}
            sub="Store-managed settings"
            icon={<Settings className="w-3.5 h-3.5 text-slate-400" />}
          />
        </WidgetBoundary>
      </div>

      {/* Detail panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetBoundary title="Workflow Defaults">
          <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-emerald-400" /> Pass Type & Approval Defaults
            </h2>
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 rounded bg-slate-800 animate-pulse" />
                <div className="h-4 rounded bg-slate-800 animate-pulse" />
                <div className="h-4 rounded bg-slate-800 animate-pulse" />
              </div>
            ) : passTypes.length === 0 ? (
              <p className="text-xs text-slate-500">No pass type configuration found — managed under Settings → Pass Types.</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {passTypes.map((p) => (
                  <div key={p.code} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {p.approval_flow ? `flow: ${p.approval_flow}` : "no custom flow"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${p.requires_approval ? "bg-amber-500/15 text-amber-300" : "bg-slate-800 text-slate-400"}`}>
                        {p.requires_approval ? "Approval" : "Direct"}
                      </span>
                      <span className={`text-[10px] font-bold uppercase ${p.is_active ? "text-emerald-400" : "text-slate-600"}`}>
                        {p.is_active ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Role Policy">
          <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <UserCog className="w-4 h-4 text-emerald-400" /> Role & Policy Snapshot
            </h2>
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 rounded bg-slate-800 animate-pulse" />
                <div className="h-4 rounded bg-slate-800 animate-pulse" />
              </div>
            ) : (d?.role_policy?.length ?? 0) === 0 ? (
              <p className="text-xs text-slate-500">Role policy is managed via the Roles section.</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {(d?.role_policy ?? []).map((r) => {
                  const permCount = Array.isArray(r.permissions)
                    ? r.permissions.length
                    : typeof r.permissions === "object" && r.permissions
                      ? Object.keys(r.permissions).length
                      : 0;
                  return (
                    <ConfigRow
                      key={r.code}
                      label={r.display_name}
                      value={`${permCount} permission${permCount === 1 ? "" : "s"}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Retention">
          <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Timer className="w-4 h-4 text-emerald-400" /> Data Retention
            </h2>
            {loading ? (
              <div className="h-4 rounded bg-slate-800 animate-pulse" />
            ) : (d?.retention_policies?.length ?? 0) === 0 ? (
              <p className="text-xs text-slate-500">No retention policies configured.</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {(d?.retention_policies ?? []).map((rp) => (
                  <ConfigRow
                    key={rp.id}
                    label={rp.data_category}
                    value={`${rp.retention_days} days${rp.auto_delete ? " · auto-delete" : ""}`}
                  />
                ))}
              </div>
            )}
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Exit Reasons">
          <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <ScrollText className="w-4 h-4 text-emerald-400" /> Exit Reason Categories
            </h2>
            {loading ? (
              <div className="h-4 rounded bg-slate-800 animate-pulse" />
            ) : (d?.exit_reasons?.length ?? 0) === 0 ? (
              <p className="text-xs text-slate-500">No exit reason configuration found.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(d?.exit_reasons ?? []).map((r) => (
                  <span
                    key={r.code}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                      r.is_active
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </WidgetBoundary>
      </div>

      {/* Read-only notice */}
      <WidgetBoundary title="Editing note">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 flex items-start gap-3">
          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Read-only view</p>
            <p className="mt-1 text-xs text-slate-400">
              Institutional configuration (workflow defaults, role policy, retention and exit-reason
              settings) is locked for admins — editing requires sysadmin access. For corrections, raise a
              sysadmin request or contact the platform team.
            </p>
          </div>
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function AdminInstitutionalConfigurationPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminInstitutionalConfigurationInner />
    </Suspense>
  );
}
