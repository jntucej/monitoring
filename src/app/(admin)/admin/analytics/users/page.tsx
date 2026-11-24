"use client";
import { UserAnalytics } from "@/components/admin/UserAnalytics";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function UserAnalyticsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <ContextSituationBar
        roleLabel="Admin"
        purpose="Analyze user demographics, role distribution, and identity trends across campus."
        contextLabel="User Demographics & Activity"
        statusPill="Live Directory"
        statusTone="info"
        statusSummary="Tracking user lifecycle, account activation rates, and cross-department enrollment trends."
        primaryAction={{ label: "User Directory", href: "/admin/users" }}
        secondaryActions={[
          { label: "Campus Analytics", href: "/admin/analytics" },
          { label: "Role Permissions", href: "/admin/roles" },
        ]}
      />
      <UserAnalytics />
    </div>
  );
}
