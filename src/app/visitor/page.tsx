import Link from "next/link";
import { UserCheck, Clock, History, User, FileText, MapPin, ArrowRight } from "lucide-react";

<<<<<<< HEAD
export const dynamic = "force-dynamic";

import { Suspense, useCallback } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {
  DoorOpen,
  Clock,
  ShieldCheck,
  Info,
  Ticket,
  AlertTriangle,
  Loader2,
  LogOut,
} from "lucide-react";

const MIN_TIER = 10; // visitor tier (lowest)

/* ── response shapes ── */

interface VisitorLogRow {
  id: string;
  user_id: string;
  check_in_at: string;
  check_out_at?: string | null;
  purpose?: string | null;
  status: string;
  person?: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
  } | null;
  host?: {
    id: string;
    name?: string;
  } | null;
}

interface VisitorsResponse {
  success: boolean;
  data: VisitorLogRow[];
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* ── main content ── */

function VisitorDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "visitor") as Role;
  const tier = getRoleTier(role);

  // Visitor logs (active visitor passes). The route is operator/admin-scoped;
  // a visitor role will get a 403 — rendered as a graceful banner, not a crash.
  const {
    data: visitorData,
    loading,
    error,
    refresh,
  } = useApiResource<VisitorsResponse>("/api/visitors?status=active", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const activeLogs = (visitorData?.data ?? []).filter(
    (l) => l.status === "active" && !l.check_out_at
  );
  // A visitor account's own log: match on user id if present in the list.
  const myLog = user ? activeLogs.find((l) => l.user_id === user.id) ?? activeLogs[0] : activeLogs[0];

  const passStatus = !visitorData ? "UNAVAILABLE" : activeLogs.length ? "ACTIVE" : "CHECKED OUT";
=======
const CARDS = [
  { href: "/visitor/registration",   icon: UserCheck, label: "Registration",     desc: "Update your visitor profile" },
  { href: "/visitor/request",        icon: FileText,  label: "Request Visit",    desc: "Ask a host to approve" },
  { href: "/visitor/approval-status", icon: Clock,    label: "Approval Status",  desc: "See if you are approved" },
  { href: "/visitor/checkin-out",    icon: MapPin,    label: "Check In / Out",   desc: "Record your entry and exit" },
  { href: "/visitor/host-info",      icon: User,      label: "Host Info",        desc: "Who you are visiting" },
  { href: "/visitor/history",        icon: History,   label: "History",          desc: "Past visits" },
];
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31

export default function VisitorLandingPage() {
  return (
<<<<<<< HEAD
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 min-w-0">
      
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            <DoorOpen className="w-6 h-6 text-emerald-400" />
            Visitor Dashboard
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier} ·{" "}
            {user?.name || "Campus Visitor"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={() => void refreshAll()}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-50"
=======
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Visitor Portal</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Manage your visit, host approval, and check-in/out.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARDS.map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center justify-between rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-elev-1)] transition-colors"
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold truncate">{label}</div>
                <div className="text-xs text-[var(--text-muted)] truncate">{desc}</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--action-primary)] transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
