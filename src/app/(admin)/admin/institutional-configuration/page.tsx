"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { CollegeInfoForm } from "@/components/admin/CollegeInfoForm";
import { PassTypesForm } from "@/components/admin/PassTypesForm";
import { ExitReasonsManager } from "@/components/admin/ExitReasonsManager";
import { getAuthHeaders } from "@/lib/utils";
import {
  Info,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

/* ── API response shape ───────────────────────────────────────────────────── */

interface CollegeInfoData {
  name: string | null;
  short_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
  accreditation: string | null;
  website: string | null;
  principal: string | null;
  updated_at: string | null;
}

interface PassTypeData {
  code: string;
  name: string;
  requires_approval: boolean;
  approval_flow: string | null;
  is_active: boolean;
}

interface ExitReasonData {
  code: string;
  name: string;
  description: string | null;
  applicable_to: string[] | null;
  requires_approval: boolean;
  approval_by: string | null;
  parent_notification: string | null;
  max_duration_hours: number | null;
  is_active: boolean;
}

interface RetentionPolicyData {
  id: string;
  data_category: string;
  retention_days: number;
  auto_delete: boolean;
}

interface SystemSettingData {
  id: string;
  value: unknown;
  updated_at: string;
}

interface RoleRegistryData {
  code: string;
  display_name: string;
  description: string | null;
  permissions: unknown;
  is_active: boolean;
}

interface InstitutionalConfigResponse {
  collegeInfo: CollegeInfoData | null;
  passTypes: PassTypeData[];
  exitReasons: ExitReasonData[];
  retentionPolicies: RetentionPolicyData[];
  systemSettings: SystemSettingData[];
  securityPosture: Record<string, unknown>;
  roleRegistry: RoleRegistryData[];
}

/* ── Read-only info card ─────────────────────────────────────────────────── */

function ReadOnlyCard({
  title,
  subtitle,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  subtitle: string;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            <p className="text-[11px] text-slate-500">{subtitle}</p>
          </div>
        </div>
        <a
          href={href}
          className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 shrink-0"
        >
          {hrefLabel}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      {children}
    </div>
  );
}

/* ── inner page ──────────────────────────────────────────────────────────── */

function InstitutionalConfigurationInner() {
  const [snapshot, setSnapshot] = useState<InstitutionalConfigResponse | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);

  const fetchSnapshot = useCallback(async () => {
    setSnapshotLoading(true);
    try {
      const res = await fetch("/api/admin/institutional-configuration", {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSnapshot(json.data);
      }
    } catch {
      // keep null on error
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  const [confirmDeactivate, setConfirmDeactivate] = useState<PassTypeData | null>(null);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  const deactivatePassType = async (passType: PassTypeData) => {
    if (!snapshot) return;
    try {
      const activeTypes = snapshot.passTypes.filter((p) => p.is_active).map((p) => p.code);
      const remaining = activeTypes.filter((code) => code !== passType.code);
      const res = await fetch("/api/config/pass-types", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(
          remaining.map((code) => {
            const original = snapshot.passTypes.find((p) => p.code === code);
            return {
              code,
              name: original?.name ?? code,
              requiresApproval: original?.requires_approval ?? true,
              approvalFlow: original?.approval_flow ?? "principal",
            };
          })
        ),
      });
      const json = await res.json();
      if (json.success) {
        // refetch snapshot
        await fetchSnapshot();
      }
    } catch {
      // ignore
    }
    setConfirmDeactivate(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Configuration"
        subtitle="Manage institutional settings. Sysadmin-only sections are read-only here."
      />

      {/* ── Editable sections (admin) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetBoundary title="College Info">
          <CollegeInfoForm />
        </WidgetBoundary>

        <WidgetBoundary title="Pass Types">
          <div className="space-y-3">
            <PassTypesForm />
            {snapshot?.passTypes?.some((p) => p.is_active) && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.04] p-3">
                <p className="text-xs font-semibold text-rose-400 mb-2">
                  Deactivate pass type
                </p>
                <div className="flex flex-wrap gap-2">
                  {snapshot.passTypes
                    .filter((p) => p.is_active)
                    .map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => setConfirmDeactivate(p)}
                        className="rounded-md px-2 py-1 text-[11px] font-medium border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </WidgetBoundary>
      </div>

      <WidgetBoundary title="Exit Reasons">
        <div className="space-y-3">
          <ExitReasonsManager
            initialReasons={
              snapshot?.exitReasons?.map((r) => ({
                code: r.code,
                name: r.name,
                description: r.description ?? "",
                applicableTo: r.applicable_to ?? [],
                requiresApproval: r.requires_approval,
                approvalBy: r.approval_by ?? "none",
                parentNotification: r.parent_notification ?? "silent",
                maxDurationHours: r.max_duration_hours,
                is_active: r.is_active,
              })) ?? []
            }
            onChanged={fetchSnapshot}
          />
        </div>
      </WidgetBoundary>

      {/* ── Read-only sysadmin sections ───────────────────────────────────── */}
      <div>
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          Sysadmin-Managed (Read-Only)
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <WidgetBoundary title="Retention Policies">
            <ReadOnlyCard
              title="Retention Policies"
              subtitle="Data categories & retention windows"
              href="/sysadmin/compliance"
              hrefLabel="Open in Sysadmin →"
            >
              {snapshotLoading ? (
                <div className="h-4 rounded bg-slate-800 animate-pulse" />
              ) : snapshot?.retentionPolicies?.length ? (
                <div className="divide-y divide-slate-800/60">
                  {snapshot.retentionPolicies.map((rp) => (
                    <div key={rp.id} className="flex items-center justify-between py-2">
                      <span className="text-xs text-slate-400">{rp.data_category}</span>
                      <span className="text-xs font-medium text-slate-200">
                        {rp.retention_days} days
                        {rp.auto_delete ? " · auto-delete" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No retention policies configured.</p>
              )}
            </ReadOnlyCard>
          </WidgetBoundary>

          <WidgetBoundary title="Security Posture">
            <ReadOnlyCard
              title="System Settings (Security Posture)"
              subtitle="MFA, session timeout, login limits"
              href="/sysadmin/security"
              hrefLabel="Open in Sysadmin →"
            >
              {snapshotLoading ? (
                <div className="h-4 rounded bg-slate-800 animate-pulse" />
              ) : snapshot && Object.keys(snapshot.securityPosture).length > 0 ? (
                <div className="divide-y divide-slate-800/60">
                  {Object.entries(snapshot.securityPosture).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <span className="text-xs text-slate-400">{key}</span>
                      <span className="text-xs font-medium text-slate-200">
                        {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No security posture settings found. Defaults apply.
                </p>
              )}
            </ReadOnlyCard>
          </WidgetBoundary>

          <WidgetBoundary title="Role Registry">
            <ReadOnlyCard
              title="Role Registry"
              subtitle="Active role definitions"
              href="/sysadmin/roles"
              hrefLabel="Open in Sysadmin →"
            >
              {snapshotLoading ? (
                <div className="h-4 rounded bg-slate-800 animate-pulse" />
              ) : snapshot?.roleRegistry?.length ? (
                <div className="divide-y divide-slate-800/60">
                  {snapshot.roleRegistry.map((role) => {
                    const permCount = Array.isArray(role.permissions)
                      ? role.permissions.length
                      : typeof role.permissions === "object" && role.permissions
                        ? Object.keys(role.permissions).length
                        : 0;
                    return (
                      <div key={role.code} className="flex items-center justify-between py-2">
                        <span className="text-xs text-slate-400">{role.display_name}</span>
                        <span className="text-xs font-medium text-slate-200">
                          {permCount} permission{permCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No active roles found.</p>
              )}
            </ReadOnlyCard>
          </WidgetBoundary>
        </div>
      </div>

      <DevContactStrip />

      <ConfirmDialog
        open={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        title="Deactivate Pass Type"
        body={`Are you sure you want to deactivate "${confirmDeactivate?.name}"? Passes issued under this type will no longer be accepted.`}
        onConfirm={() => void deactivatePassType(confirmDeactivate!)}
        confirmText="Deactivate"
        variant="warning"
      />
    </div>
  );
}

export default function AdminInstitutionalConfigurationPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <InstitutionalConfigurationInner />
      </Suspense>
    </AuthGuard>
  );
}
