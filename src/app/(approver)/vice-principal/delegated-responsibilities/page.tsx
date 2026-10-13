"use client";

import { Suspense } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import {
  Briefcase,
  ArrowRight,
  CalendarCheck,
  ClipboardCheck,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

interface Duty {
  title: string;
  detail: string;
  href?: string;
  hrefLabel?: string;
}

const DUTIES: Duty[] = [
  {
    title: "Examination coordination",
    detail:
      "Exam workflow oversight: clearance queues, SLA watch, and escalation of blocked exam requests.",
    href: "/vice-principal/examination-coordination",
    hrefLabel: "Examination ops",
  },
  {
    title: "Attendance exception review",
    detail:
      "Daily exception triage: absences, late check-ins and flagged staff with a single desk view.",
    href: "/vice-principal/attendance-exceptions",
    hrefLabel: "Exception desk",
  },
  {
    title: "Hostel & security rollups",
    detail:
      "Live presence across gates, active-gate posture and the unresolved alert summary.",
    href: "/vice-principal/hostel-security-summaries",
    hrefLabel: "Rollup view",
  },
  {
    title: "Approval delegation",
    detail:
      "VP-stage queue: approve, reject or escalate delegated institutional workflows.",
    href: "/vice-principal/pending-approvals",
    hrefLabel: "Approvals",
  },
  {
    title: "Escalation handling",
    detail:
      "Review of requests escalated to the principal stage, with full request timelines.",
    href: "/vice-principal/escalated-requests",
    hrefLabel: "Escalated",
  },
  {
    title: "Decision log",
    detail:
      "Institutional memory of past VP decisions — approved, rejected and escalated tickets.",
    href: "/vice-principal/decision-history",
    hrefLabel: "History",
  },
];

function VpDelegatedResponsibilitiesInner() {
  const backendPending = true;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Delegated Responsibilities">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
            <Briefcase className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Delegated Duties — Vice Principal
            </span>
          </div>

          {/* Scope card */}
          <div className="mb-4 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-slate-300 min-w-0">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Delegated Authority</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Delegation scope is set by the institution administrator via role permissions.
                  The duties below carry VP-level authority: exam operations, attendance
                  exceptions, hostel &amp; security rollups, and approval delegation.
                </p>
              </div>
            </div>
          </div>

          {/* Duties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
            {DUTIES.map((d) => (
              <div
                key={d.title}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 flex flex-col gap-2 min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ClipboardCheck className="w-4 h-4 text-sky-400 shrink-0" />
                  <p className="text-sm font-semibold text-white truncate">{d.title}</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed min-w-0">{d.detail}</p>
                {d.href && d.hrefLabel && (
                  <Link
                    href={d.href}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    {d.hrefLabel} <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Delegation backend status */}
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4 min-w-0">
            <div className="flex items-start gap-3">
              <ScrollText className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200">Live delegation ledger</p>
                {backendPending ? (
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Delegation backend pending — the institution administrator has not yet
                    configured a per-role delegation ledger. The standing delegated duties above
                    apply in the meantime.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Delegations configured by the administrator are shown here once the
                    backend goes live.
                  </p>
                )}
                <Link
                  href="/vice-principal/decision-history"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                >
                  <CalendarCheck className="w-3.5 h-3.5" /> View decision history
                </Link>
              </div>
            </div>
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function VpDelegatedResponsibilitiesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VpDelegatedResponsibilitiesInner />
    </Suspense>
  );
}
