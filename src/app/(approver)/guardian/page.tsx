"use client";

import { Suspense, useCallback, useMemo, lazy } from "react";
import Link from "next/link";

import { PageLoading } from "@/components/shared/LoadingStates";

import {
  ShieldCheck,
  Users,
  Inbox,
  Ticket,
  Loader2,
  ArrowRight,
  Clock,
  Repeat,
  FileText
} from "lucide-react";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
const ParentWeeklyDigest = lazy(
  () => import("@/components/parent/ParentWeeklyDigest")
);
const ParentConsentInbox = lazy(
  () => import("@/components/parent/ParentConsentInbox").then((m) => ({ default: m.ParentConsentInbox }))
);

import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import {
  KVPairs,
  ActionRow,
  InspectorButton,
  type EntityInspection,
} from "@/components/shared/EntityInspector";
import { useAuthStore } from "@/stores/authStore";
import type { GatePass, Person } from "@/lib/types";
import { AuthGuard } from "@/components/shared/AuthGuard";

/** Build an EntityInspection for a ward record (guardian view). */
function buildChildRecordInspection(p: Person): EntityInspection {
  const onCampus = !!(p.checkedInAt && !p.checkedOutAt);
  const roll = p.roll ?? p.uniqueId ?? p.id;
  const displayName = p.name ?? p.fullName ?? "Unknown ward";
  const sections: EntityInspection["sections"] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Name", value: displayName },
            { label: "Roll", value: roll },
            { label: "On campus", value: onCampus ? "Yes" : "No" },
            { label: "Checked in", value: p.checkedInAt ? new Date(p.checkedInAt).toLocaleString() : "—" },
            { label: "Checked out", value: p.checkedOutAt ? new Date(p.checkedOutAt).toLocaleString() : "—" },
          ]}
        />
      ),
    },
    {
      title: "Actions",
      content: (
        <ActionRow>
          <InspectorButton href="/guardian/child-status" variant="primary">
            Ward status
          </InspectorButton>
          <InspectorButton href="/guardian/child-attendance" variant="ghost">
            Attendance
          </InspectorButton>
          <InspectorButton href="/guardian/child-movement" variant="ghost">
            Movement
          </InspectorButton>
        </ActionRow>
      ),
    },
  ];

  return {
    kind: "child_record",
    title: displayName,
    subtitle: roll,
    status: (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${onCampus ? "bg-emerald-500/10 text-action-success border border-emerald-500/20" : "bg-bg-elevated text-text-muted border border-border"}`}>
        {onCampus ? "ON CAMPUS" : "OFF CAMPUS"}
      </span>
    ),
    sections,
    detailHref: "/guardian/child-status",
    detailLabel: "Ward detail",
  };
}


/* ── response shapes ── */

interface PersonsResponse {
  success: boolean;
  data: Person[];
}

interface PassesResponse {
  success: boolean;
  data: GatePass[];
}

interface PermissionRow {
  id: string;
  ticket_number?: string;
  workflow_type?: string;
  status?: string;
  student_user_id?: string | null;
  created_at?: string;
}

interface PermissionListData {
  success: boolean;
  data: PermissionRow[];
  total?: number;
}

/* ── building blocks ── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-white",
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="surface-card bg-bg-surface p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="w-4 h-4 text-action-success" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </div>
  );
}

function SectionLink({
  href,
  icon: Icon,
  title,
  sub,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="surface-card group bg-bg-surface p-4 flex items-center gap-3 hover:bg-bg-elevated transition-colors motion-reduce:transition-none"
    >
      <div className="surface-card bg-emerald-500/10 p-2 text-action-success shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="text-xs text-text-muted truncate">{sub}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-action-success shrink-0" />
    </Link>
  );
}

/* ── main content ── */

function GuardianOverviewInner() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "";
  const { inspection, inspect, closeInspection } = useEntityInspector();

  const {
    data: persons,
    loading: personsLoading,
    refresh: refreshPersons,
  } = useApiResource<PersonsResponse>("/api/persons?parentId=me", {
    ttlMs: 30_000,
    enabled: !!userId,
  });

  const {
    data: passes,
    loading: passesLoading,
    refresh: refreshPasses,
  } = useApiResource<PassesResponse>(
    `/api/passes?parentId=${encodeURIComponent(userId)}`,
    { ttlMs: 30_000, enabled: !!userId }
  );

  const {
    data: pending,
    loading: pendingLoading,
    refresh: refreshPending,
  } = useApiResource<PermissionListData>("/api/permissions?status=PENDING", {
    ttlMs: 60_000,
    enabled: !!userId,
  });

  const refresh = useCallback(async () => {
    await Promise.all([refreshPersons(), refreshPasses(), refreshPending()]);
  }, [refreshPersons, refreshPasses, refreshPending]);

  usePolling(refresh, { intervalMs: 60_000, enabled: !!userId });

  const wards: Person[] = persons?.data ?? [];
  const passList: GatePass[] = passes?.data ?? [];
  const pendingRows = useMemo<PermissionRow[]>(() => {
    const rows = pending?.data;
    return Array.isArray(rows) ? rows : [];
  }, [pending]);

  const onCampus = wards.filter((w) => w.checkedInAt && !w.checkedOutAt).length;
  const offCampus = Math.max(wards.length - onCampus, 0);
  const pendingPasses = passList.filter(
    (p) => p.finalStatus === "PENDING" || p.finalStatus === "APPROVED_PARENT"
  );
  const activePasses = passList.filter(
    (p) => p.finalStatus === "APPROVED" || p.finalStatus === "APPROVED_ADMIN"
  );



  return (
    <div className="min-w-0 space-y-6">
      {/* header + refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-action-success" />
            Linked Student Overview
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Signed in as{" "}
            <span className="font-mono text-text-secondary">
              {user?.role ?? "guardian"}
            </span>
            {user?.name ? ` · ${user.name}` : ""}
            {" — submission only, no approval authority"}
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Wards Supervised"
          value={wards.length}
          sub="Students linked to your account"
          accent="text-white"
          loading={personsLoading && wards.length === 0}
        />
        <StatCard
          icon={ShieldCheck}
          label="On Campus"
          value={onCampus}
          sub={`${offCampus} ward(s) off campus`}
          accent="text-action-info"
          loading={personsLoading && wards.length === 0}
        />
        <StatCard
          icon={Inbox}
          label="Pending Requests"
          value={pendingRows.length || pending?.total || 0}
          sub="Ward pass/leave requests awaiting the approval chain"
          accent="text-action-warning"
          loading={pendingLoading && pendingRows.length === 0}
        />
        <StatCard
          icon={Ticket}
          label="Active Passes"
          value={activePasses.length}
          sub={`${pendingPasses.length} still pending`}
          accent="text-action-success"
          loading={passesLoading && passList.length === 0}
        />
      </div>

      {/* Ward cards — click to inspect */}
      {wards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {wards.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => inspect(buildChildRecordInspection(w))}
              className="surface-card bg-bg-surface p-4 text-left hover:bg-bg-elevated transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">{w.name ?? w.fullName}</p>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${!(!w.checkedInAt || w.checkedOutAt) ? "bg-emerald-500/10 text-action-success" : "bg-bg-elevated text-text-muted"}`}>
                  {w.checkedInAt && !w.checkedOutAt ? "ON CAMPUS" : "OFF CAMPUS"}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1">{w.roll ?? w.uniqueId ?? w.id}</p>
            </button>
          ))}
        </div>
      )}

      {/* section quick-links — aligned to the 7 spec sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SectionLink
          href="/guardian/child-attendance"
          icon={Clock}
          title="Attendance Summary"
          sub="Ward attendance and weekly gate activity"
        />
        <SectionLink
          href="/guardian/movement-info"
          icon={Repeat}
          title="Authorised Movement Information"
          sub="Recent authorised entry and exit at the gates"
        />
        <SectionLink
          href="/guardian/pass-leave-submission"
          icon={FileText}
          title="Pass & Leave Request"
          sub="Submit a pass or leave request for a ward"
        />
        <SectionLink
          href="/guardian/request-status"
          icon={Inbox}
          title="Request Status"
          sub="Approval timelines for your wards’ requests"
        />
        <SectionLink
          href="/guardian/notifications"
          icon={ShieldCheck}
          title="Notifications"
          sub="Alerts, approvals and campus notices"
        />
        <SectionLink
          href="/guardian/contact-info"
          icon={Users}
          title="Contact Information"
          sub="Your account contact details"
        />
      </div>

      {/* shared + retention panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <QuickActions />
        <NotificationCenter />
      </div>
      <PersonalizedCampusHome />
      <AttentionQueue />
      <ActivityTimeline />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaskContinuity />
        <UnifiedCampusCalendar />
      </div>

      <Suspense fallback={null}>
        <ParentWeeklyDigest />
        <ParentConsentInbox />
      </Suspense>

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
export default function GuardianOverviewPage() {
  return (
    <AuthGuard allowedRoles={['guardian', 'parent', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <GuardianOverviewInner />
      </Suspense>
    </AuthGuard>
  );
}
