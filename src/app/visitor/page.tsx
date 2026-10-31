"use client";

import Link from "next/link";
import { UserCheck, Clock, History, User, FileText, MapPin, ArrowRight } from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";

const CARDS = [
  { href: "/visitor/registration",   icon: UserCheck, label: "Registration",     desc: "Update your visitor profile" },
  { href: "/visitor/request",        icon: FileText,  label: "Request Visit",    desc: "Ask a host to approve" },
  { href: "/visitor/approval-status", icon: Clock,    label: "Approval Status",  desc: "See if you are approved" },
  { href: "/visitor/checkin-out",    icon: MapPin,    label: "Check In / Out",   desc: "Record your entry and exit" },
  { href: "/visitor/host-info",      icon: User,      label: "Host Info",        desc: "Who you are visiting" },
  { href: "/visitor/history",        icon: History,   label: "History",          desc: "Past visits" },
];

export default function VisitorLandingPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Visitor Portal</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Manage your visit, host approval, and check-in/out.
        </p>
      </header>
      <WidgetBoundary name="VisitorNavigation" title="Visitor Services">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
