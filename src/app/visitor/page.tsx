"use client";

import Link from "next/link";
import { UserCheck, FileText, History, MapPin, ArrowRight } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import type { VisitorsMineResponse } from "./types";

// 1.8 — status home: shows the visitor's live visit state + check-in/out CTA,
// with the remaining surfaces (request, registration, history) as compact links.
const CARDS = [
  { href: "/visitor/request",      icon: FileText,  label: "Request Visit", desc: "Ask a host to approve" },
  { href: "/visitor/registration", icon: UserCheck, label: "Registration",  desc: "Update your visitor profile" },
  { href: "/visitor/history",      icon: History,   label: "History",       desc: "Past visits" },
];

export default function VisitorLandingPage() {
  const { data, loading } = useApiResource<VisitorsMineResponse>("/api/visitors/mine", { ttlMs: 30_000 });
  const state = data?.data?.approvalStatus.state;
  const host = data?.data?.hostInfo.name;
  const purpose = data?.data?.visitDetails.purpose;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Visitor Portal</h1>
        <p className="text-sm text-[var(--text-muted)]">Your visit status, check-in/out, and history.</p>
      </header>

      <WidgetBoundary name="VisitorStatusHome" title="Your visit">
        {loading ? (
          <PageLoading />
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-3">
            <div className="text-sm text-[var(--text-secondary)]">
              Status: <strong>{state ?? "No visit"}</strong>
              {host && <> · Host: <strong>{host}</strong></>}
              {purpose && <> · {purpose}</>}
            </div>
            <Link
              href="/visitor/visit"
              className="flex items-center justify-between rounded-lg bg-[var(--action-primary)] px-4 py-2.5 text-sm font-semibold text-white"
            >
              {state === "ACTIVE" ? "Check out" : "Check in"}
              <MapPin className="w-4 h-4" />
            </Link>
          </div>
        )}
      </WidgetBoundary>

      <WidgetBoundary name="VisitorNavigation" title="Visitor services">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CARDS.map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group min-h-[44px] flex items-center justify-between rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-elev-1)] transition-colors"
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
      </WidgetBoundary>

      <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home">
        <PersonalizedCampusHome />
      </WidgetBoundary>
      <WidgetBoundary name="TaskContinuity" title="Task Continuity">
        <TaskContinuity />
      </WidgetBoundary>
    </div>
  );
}
