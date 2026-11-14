"use client";


import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { KeyRound, Bell, ChevronRight } from "lucide-react";

export default function SettingsHubPage() {
  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 sm:space-y-6 min-w-0">
        {/* Page title — global DynamicHeader renders the app header */}
        <div>
          <p className="text-sm font-medium text-text-secondary mb-3">Settings</p>
          <p className="text-sm text-text-muted mt-1">
            Manage your account, security, and notifications.
          </p>
        </div>

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
      className="surface-card flex items-center gap-4 bg-bg-surface p-4 hover:bg-bg-elevated transition"
    >
      <div className="surface-card p-2.5 bg-action-primary/10 text-action-primary">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-text-muted" />
    </Link>
  );
}