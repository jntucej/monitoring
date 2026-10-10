"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { KeyRound, Bell, ChevronRight } from "lucide-react";

export default function SettingsHubPage() {
  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Settings</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage your account, security, and notifications.
          </p>
        </header>

        <div className="grid gap-4">
          <SettingTile
            href="/settings/password"
            icon={<KeyRound className="w-5 h-5" />}
            title="Change password"
            description="Update the password used to sign in to your account."
          />
          <SettingTile
            href="/settings/notifications"
            icon={<Bell className="w-5 h-5" />}
            title="Notifications"
            description="Choose which channels and event types notify you."
          />
        </div>
      </div>
    </AuthGuard>
  );
}

function SettingTile({
  href, icon, title, description,
}: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 hover:bg-[var(--bg-elevated)] transition"
    >
      <div className="p-2.5 rounded-xl bg-[var(--action-primary)]/10 text-[var(--action-primary)]">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
    </Link>
  );
}