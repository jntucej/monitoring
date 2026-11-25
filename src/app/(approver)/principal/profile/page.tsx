"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { useAuthStore } from "@/stores/authStore";

export default function PrincipalProfilePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4 min-w-0">
      <h1 className="text-xl font-bold text-text-primary">Principal Profile</h1>
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Executive account details, statutory credentials, and institutional delegation parameters"
        why="Maintaining executive credentials and security settings safeguards institutional authority and digital signing keys."
        contextLabel="Principal Office Profile"
        statusSummary="Manage executive contact information, cryptographic signing keys, and administrative settings."
        primaryAction={{ label: "Delegations Desk", href: "/principal/governance/delegations" }}
        secondaryAction={{ label: "Command Center", href: "/principal" }}
      />
      <div className="surface-card bg-bg-surface p-5 space-y-2">
        <p className="text-sm font-semibold">{user?.name || "Principal"}</p>
        <p className="text-sm text-text-muted">{user?.email || "—"}</p>
        <p className="text-xs uppercase text-action-primary">{user?.role || "principal"}</p>
      </div>
    </div>
  );
}
