"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock,
  AlertTriangle,
  Zap,
  Calendar,
  User,
  ChevronRight,
  CheckCircle,
  BookOpen,
  MessageSquare,
  BarChart3,
  Handshake,
  Award,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useEngagementStore, resolveWidgetOrder } from "@/stores/engagementStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { getAuthHeaders } from "@/lib/utils";
import type { Role } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface PendingTask {
  id: string;
  title: string;
  status: string;
  slaDeadline?: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  startsAt: string;
  location?: string;
  category: string;
}

interface RecommendedAction {
  label: string;
  icon: "alert" | "zap" | "calendar" | "user" | "check";
  priority: "high" | "medium" | "low";
}

/* ------------------------------------------------------------------ */
/* Deterministic next-action rules                                     */
/* ------------------------------------------------------------------ */

function getRecommendedActions(
  role: Role | null,
  pendingTasks: PendingTask[],
  events: UpcomingEvent[],
  roleContext: {
    isOperator: boolean;
    hasOverdueRequests: number;
    lastReaderFault: boolean;
  }
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  // Approver: overdue requests
  if (
    ["admin", "sysadmin", "supervisor", "hod", "principal", "vice_principal"].includes(
      role ?? ""
    ) &&
    roleContext.hasOverdueRequests > 0
  ) {
    actions.push({
      label: `Review ${roleContext.hasOverdueRequests} overdue request(s)`,
      icon: "alert",
      priority: "high",
    });
  }

  // Operator: reader fault
  if (roleContext.isOperator && roleContext.lastReaderFault) {
    actions.push({
      label: "Check reader / gate device status",
      icon: "zap",
      priority: "high",
    });
  }

  // Student: upcoming events
  const studentEvents = events.filter((e) =>
    ["student", "workshop", "volunteering"].includes(e.category)
  );
  if (role === "student" && studentEvents.length > 0) {
    actions.push({
      label: `Register for ${studentEvents.length} upcoming event(s)`,
      icon: "calendar",
      priority: "medium",
    });
  }

  // Faculty/HOD: pending approvals
  if (["faculty", "hod"].includes(role ?? "") && pendingTasks.length > 0) {
    actions.push({
      label: `Approve ${pendingTasks.length} pending item(s)`,
      icon: "check",
      priority: "medium",
    });
  }

  // Default: nothing pending
  if (actions.length === 0) {
    actions.push({
      label: "All caught up — check your calendar for upcoming items",
      icon: "user",
      priority: "low",
    });
  }

  return actions.slice(0, 4);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function PersonalizedCampusHome() {
  const { user, role } = useAuthStore();
  const engagementState = useEngagementStore();
  const widgetOrder = useMemo(
    () => resolveWidgetOrder(engagementState),
    [engagementState]
  );

  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      // Fetch pending tasks (role-scoped)
      const taskRes = await fetch(
        `/api/permissions?status=PENDING&assigned_stage=${encodeURIComponent(
          role ?? ""
        )}&limit=5`,
        { headers, cache: "no-store" }
      );
      const taskData = await taskRes.json().catch(() => null);
      if (taskData?.success && taskData.data?.requests) {
        const tasks: PendingTask[] = taskData.data.requests.map((r: any) => ({
          id: r.id,
          title: `${r.workflow_type ?? "Request"} ${r.ticket_number ?? ""}`,
          status: r.status,
          slaDeadline: r.sla_deadline,
        }));
        setPendingTasks(tasks);
      }

      // Fetch upcoming events
      const evRes = await fetch("/api/campus/events", {
        headers,
        cache: "no-store",
      });
      const evData = await evRes.json().catch(() => null);
      if (evData?.success && evData.data?.events) {
        const evts: UpcomingEvent[] = evData.data.events.slice(0, 5).map((e: any) => ({
          id: e.id,
          title: e.title,
          startsAt: e.startsAt,
          location: e.location,
          category: e.category,
        }));
        setEvents(evts);
      }
    } catch {
      // Silently fail — show empty state
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    load();
  }, [load]);

  const roleContext = useMemo(
    () => ({
      isOperator: role === "operator" || role === "caretaker",
      hasOverdueRequests: pendingTasks.filter(
        (t) =>
          t.slaDeadline && new Date(t.slaDeadline) < new Date()
      ).length,
      lastReaderFault: false,
    }),
    [role, pendingTasks]
  );

  const actions = useMemo(
    () => getRecommendedActions(role, pendingTasks, events, roleContext),
    [role, pendingTasks, events, roleContext]
  );

  const pinnedWidgets = engagementState.pinnedWidgets;

  return (
    <WidgetBoundary title="Personalized Campus Home">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Hero: Greeting + Role */}
        <div
          className={`rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 ${
            pinnedWidgets.includes("profile") ? "ring-1 ring-indigo-500/30" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20">
              <User className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-100">
                Welcome back, {user?.name?.split(" ")[0] ?? "there"}
              </p>
              <p className="text-xs text-slate-400 capitalize">{role ?? "user"}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Your campus home — updated to your role and current context.
          </p>
        </div>

        {/* Pending Tasks */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-200">Pending Tasks</h3>
          </div>
          {loading ? (
            <div className="h-20 animate-pulse rounded bg-slate-700/30" />
          ) : pendingTasks.length === 0 ? (
            <p className="text-xs text-slate-500">No pending tasks.</p>
          ) : (
            <ul className="space-y-2">
              {pendingTasks.map((t) => (
                <li key={t.id} className="text-xs text-slate-300 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{t.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-200">Upcoming Events</h3>
          </div>
          {loading ? (
            <div className="h-20 animate-pulse rounded bg-slate-700/30" />
          ) : events.length === 0 ? (
            <p className="text-xs text-slate-500">No upcoming events.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="text-xs text-slate-300 flex items-center gap-2">
                  <span className="text-emerald-400">•</span>
                  <span className="truncate flex-1">{e.title}</span>
                  <span className="text-slate-500 shrink-0">
                    {new Date(e.startsAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recommended Actions */}
        <div
          className={`rounded-xl border border-slate-700/50 bg-gradient-to-br from-indigo-900/40 to-slate-800/40 p-5 col-span-1 sm:col-span-2 lg:col-span-3 ${
            pinnedWidgets.includes("feed") ? "ring-1 ring-indigo-500/30" : ""
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-medium text-slate-100">Recommended Next Actions</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actions.map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${
                  a.priority === "high"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                    : a.priority === "medium"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    : "border-slate-600/50 bg-slate-700/30 text-slate-300"
                }`}
              >
                {a.icon === "alert" && <AlertTriangle className="h-4 w-4 shrink-0" />}
                {a.icon === "zap" && <Zap className="h-4 w-4 shrink-0" />}
                {a.icon === "calendar" && <Calendar className="h-4 w-4 shrink-0" />}
                {a.icon === "check" && <CheckCircle className="h-4 w-4 shrink-0" />}
                {a.icon === "user" && <User className="h-4 w-4 shrink-0" />}
                <span>{a.label}</span>
                <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access Strip */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 col-span-1 sm:col-span-2 lg:col-span-3">
          <h3 className="text-xs font-medium text-slate-400 mb-3">Quick Access</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Knowledge Centre", icon: BookOpen },
              { label: "Feedback Desk", icon: MessageSquare },
              { label: "Analytics", icon: BarChart3 },
              { label: "Handover", icon: Handshake },
              { label: "Portfolio", icon: Award },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-slate-600/50 bg-slate-700/30 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600/40 transition-colors motion-reduce:transition-none"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </WidgetBoundary>
  );
}

export default PersonalizedCampusHome;
