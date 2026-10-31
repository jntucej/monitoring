"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  ArrowUpRight,
  FilePlus2,
  Ticket,
  ScanLine,
  LayoutDashboard,
  ClipboardList,
} from "lucide-react";
import { useAuthStore, useHasHydrated } from "@/stores/authStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

/**
 * QuickActions — a compact set of role-aware quick-action buttons.
 *
 * Reads the user's role from useAuthStore and shows 3-6 contextually
 * useful actions that route to the correct sub-pages. No admin/approver
 * power is granted to non-approvers: approver-only actions render only
 * when the signed-in user actually holds an approver or admin role.
 */

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const APPROVER_ROLES = new Set([
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "faculty",
  "hod",
  "oie",
  "vice_principal",
  "principal",
  "exam_branch",
  "exam_superintendent",
  "admin",
  "sysadmin",
]);

/** Canonical home + approvals inbox per approver role. */
const APPROVER_HOMES: Record<string, { home: string; inbox: string; escalated?: string }> = {
  principal: { home: "/principal", inbox: "/principal/permissions", escalated: "/principal/permissions?status=ESCALATED" },
  admin: { home: "/admin", inbox: "/admin/permissions", escalated: "/admin/permissions?status=ESCALATED" },
  sysadmin: { home: "/sysadmin", inbox: "/sysadmin", escalated: "/sysadmin?tab=approvals" },
  faculty: { home: "/faculty", inbox: "/faculty/permissions", escalated: "/faculty/permissions?status=ESCALATED" },
  hod: { home: "/hod", inbox: "/hod/approvals/pending", escalated: "/hod/approvals/escalated" },
  vice_principal: { home: "/vice-principal", inbox: "/vice-principal/permissions", escalated: "/vice-principal/permissions?status=ESCALATED" },
  oie: { home: "/oie", inbox: "/oie/permissions", escalated: "/oie/permissions?status=ESCALATED" },
  exam_branch: { home: "/exam-branch", inbox: "/exam/permissions", escalated: "/exam/permissions?status=ESCALATED" },
  exam_superintendent: { home: "/exam/superintendent", inbox: "/exam/permissions", escalated: "/exam/permissions?status=ESCALATED" },
  caretaker: { home: "/hostel/permissions", inbox: "/hostel/permissions", escalated: "/hostel/permissions?status=ESCALATED" },
  deputy_warden: { home: "/deputy-warden", inbox: "/deputy-warden/permissions", escalated: "/deputy-warden/permissions?status=ESCALATED" },
  hostel_manager: { home: "/hostel-manager", inbox: "/hostel-manager/permissions", escalated: "/hostel-manager/permissions?status=ESCALATED" },
};

function actionsForRole(role: string | null, userGateId?: string | null): QuickAction[] {
  if (!role) return [];

  // Approvers (including admin/sysadmin)
  if (APPROVER_ROLES.has(role)) {
    const target = APPROVER_HOMES[role] ?? { home: "/", inbox: "/", escalated: "/" };
    return [
      { label: "Open Approval Inbox", icon: Inbox, href: target.inbox },
      { label: "View Escalated", icon: ArrowUpRight, href: target.escalated ?? target.inbox },
      { label: "New Request", icon: FilePlus2, href: role === "admin" ? "/admin/permissions/new" : target.inbox },
      { label: "All Pending", icon: Ticket, href: target.inbox },
      { label: "Dashboard", icon: LayoutDashboard, href: target.home },
    ];
  }

  // Student
  if (role === "student") {
    return [
      { label: "Request Pass", icon: FilePlus2, href: "/student/permissions/new" },
      { label: "View My Requests", icon: Ticket, href: "/student/permissions" },
      { label: "My Passes", icon: ClipboardList, href: "/student/passes" },
      { label: "Dashboard", icon: LayoutDashboard, href: "/student" },
    ];
  }

  // Parent / Guardian
  if (role === "parent" || role === "guardian") {
    return [
      { label: "Request Pass", icon: FilePlus2, href: "/parent/passes" },
      { label: "View My Requests", icon: Ticket, href: "/parent/passes" },
      { label: "Child Status", icon: LayoutDashboard, href: "/parent/child" },
      { label: "Dashboard", icon: LayoutDashboard, href: "/parent" },
    ];
  }

  // Operator
  if (role === "operator") {
    const gateHref = userGateId ? `/gate/${userGateId}` : "/operator";
    return [
      { label: "Start Scan", icon: ScanLine, href: gateHref },
      { label: "View Escalated", icon: ArrowUpRight, href: "/operator" },
      { label: "Operator Desk", icon: LayoutDashboard, href: "/operator" },
    ];
  }

  // Admin / Sysadmin fallback (already handled above, but keep a floor)
  return [{ label: "Dashboard", icon: LayoutDashboard, href: "/" }];
}

export interface QuickActionsProps {
  /** Optional embedded view (no wrapper card). Default: wrapped in a card. */
  compact?: boolean;
}

export function QuickActions({ compact = false }: QuickActionsProps) {
  const hasHydrated = useHasHydrated();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? null;
  const router = useRouter();

  const actions = useMemo(() => {
    if (!hasHydrated || !role) return [] as QuickAction[];
    return actionsForRole(role, user?.gateId ?? null);
  }, [hasHydrated, role, user?.gateId]);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  const grid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => navigate(a.href)}
          className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3.5 text-left transition-all hover:border-[var(--text-muted)] hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] active:scale-[0.98]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--action-primary)]">
            <a.icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
            {a.label}
          </span>
        </button>
      ))}
    </div>
  );

  if (actions.length === 0) {
    return (
      <WidgetBoundary title="Quick Actions">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]/40 p-4 sm:p-5">
          <p className="text-xs text-[var(--text-muted)]">
            No quick actions available for your role.
          </p>
        </div>
      </WidgetBoundary>
    );
  }

  const card = (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]/40 p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <Inbox className="h-4 w-4 text-[var(--action-primary)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Quick Actions</h3>
      </div>
      {grid}
    </div>
  );

  if (compact) {
    return <WidgetBoundary title="Quick Actions">{card}</WidgetBoundary>;
  }
  return <WidgetBoundary title="Quick Actions">{card}</WidgetBoundary>;
}

export default QuickActions;
