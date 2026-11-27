"use client";

import React from "react";
import Link from "next/link";
import { KeyRound, Bell, HelpCircle, LifeBuoy } from "lucide-react";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { UserProfileTab } from "@/components/shared/UserProfileTab";
import { RoleProfileSettingsPanel } from "@/components/nav/RoleProfileSettingsPanel";
import { useAuthStore } from "@/stores/authStore";

export interface StandardRoleProfilePageProps {
  roleLabel: string;
  roleKey: string;
  homeHref: string;
  purpose?: string;
}

export function StandardRoleProfilePage({
  roleLabel,
  roleKey,
  homeHref,
  purpose,
}: StandardRoleProfilePageProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 space-y-5 min-w-0">
      <ContextSituationBar
        roleLabel={roleLabel}
        purpose={
          purpose ??
          `Manage your ${roleLabel} account identity, security settings, and workspace preferences.`
        }
        contextLabel={`${roleLabel} Profile`}
        statusTone="info"
        statusSummary="Account details are synced from your active campus session."
        primaryAction={{ label: "Back to Dashboard", href: homeHref }}
      />

      <UserProfileTab />

      <RoleProfileSettingsPanel role={user?.role ?? roleKey} />

      <div className="surface-card bg-bg-surface p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Account & Support Utilities
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link
            href="/settings/password"
            className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated/60 px-3 py-2.5 text-xs font-medium text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <KeyRound className="h-4 w-4 text-text-muted shrink-0" />
            <span>Change Password</span>
          </Link>
          <Link
            href="/settings/notifications"
            className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated/60 px-3 py-2.5 text-xs font-medium text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <Bell className="h-4 w-4 text-text-muted shrink-0" />
            <span>Notifications</span>
          </Link>
          <Link
            href="/help"
            className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated/60 px-3 py-2.5 text-xs font-medium text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <HelpCircle className="h-4 w-4 text-text-muted shrink-0" />
            <span>Help Center</span>
          </Link>
          <Link
            href="/support"
            className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated/60 px-3 py-2.5 text-xs font-medium text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <LifeBuoy className="h-4 w-4 text-text-muted shrink-0" />
            <span>Support Desk</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
