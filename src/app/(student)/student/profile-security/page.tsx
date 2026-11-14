"use client";

import { Suspense } from "react";
import Link from "next/link";
import { UserProfileTab } from "@/components/shared/UserProfileTab";
import { PageLoading } from "@/components/shared/LoadingStates";

import {User, KeyRound, Bell, ArrowRight, Lock, Eye}  from "lucide-react";

/* ── security overview cards (static status; link to real settings pages) ── */

function StudentProfileSecurityInner() {
  return (
    <div className="space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-action-primary" />
        <p className="text-sm font-semibold text-text-primary">Profile &amp; Account Security</p>
      </div>

      {/* Account profile */}
      <section aria-label="Account profile">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Your Profile</p>
          <Link
            href="/profile"
            className="text-xs font-semibold text-action-primary hover:underline"
          >
            Edit profile <ArrowRight className="size-3.5 inline" />
          </Link>
        </div>
        <UserProfileTab />
      </section>

      {/* Security overview cards */}
      <section aria-label="Account security" className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Account Security</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Password */}
          <Link
            href="/settings/password"
            className="surface-card bg-bg-surface p-4 hover: hover:bg-action-primary/5 transition-colors flex items-start gap-3 min-w-0"
          >
            <div className="size-4 rounded-lg bg-action-primary/10 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4 text-action-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary">Password</p>
              <p className="text-xs text-text-muted mt-0.5">
                Set or update your login password. You will be signed out of all devices after a change.
              </p>
              <p className="text-xs font-bold text-action-primary mt-1.5 flex items-center gap-1">
                Change password <ArrowRight className="size-3.5" />
              </p>
            </div>
          </Link>

          {/* Notifications */}
          <Link
            href="/settings/notifications"
            className="surface-card bg-bg-surface p-4 hover: hover:bg-action-primary/5 transition-colors flex items-start gap-3 min-w-0"
          >
            <div className="size-4 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-sky-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary">Notification Settings</p>
              <p className="text-xs text-text-muted mt-0.5">
                Choose which events you want notified for — passes, leave approvals, curfew, announcements.
              </p>
              <p className="text-xs font-bold text-sky-500 mt-1.5 flex items-center gap-1">
                Configure channels <ArrowRight className="size-3.5" />
              </p>
            </div>
          </Link>

          {/* Active sessions */}
          <Link
            href="/student/profile-security/sessions"
            className="surface-card bg-bg-surface p-4 hover: hover:bg-action-primary/5 transition-colors flex items-start gap-3 min-w-0"
          >
            <div className="size-4 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4 text-action-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary">Active Sessions</p>
              <p className="text-xs text-text-muted mt-0.5">
                Review where you are signed in. Sign out of any unfamiliar device immediately.
              </p>
              <p className="text-xs font-bold text-action-warning mt-1.5 flex items-center gap-1">
                Review sessions <ArrowRight className="size-3.5" />
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Authority / scoping note */}
      <div className="surface-card bg-bg-elevated/40 p-4 text-xs min-w-0">
        <p className="font-bold text-text-secondary flex items-center gap-2 mb-1.5">
          <Lock className="w-3.5 h-3.5 shrink-0" /> Data scoping
        </p>
        <p className="text-text-muted leading-relaxed">
          Your gate, attendance, and request data is strictly personal-scoped. Parents and
          guardians can only view students they are linked and verified with — and operators
          can never approve their own access exceptions. If you notice anything that looks
          out of place, use the support strip below.
        </p>
      </div>

    </div>
  );
}

export default function StudentProfileSecurityPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentProfileSecurityInner />
    </Suspense>
  );
}
