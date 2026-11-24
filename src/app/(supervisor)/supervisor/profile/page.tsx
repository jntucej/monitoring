"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ProfileView } from "../_shared/ProfileView";

export default function ProfilePage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Manage supervisor credentials, contact information, and duty preferences"
        contextLabel="Supervisor Profile"
        statusSummary="Review your supervisor account details, assigned guard zones, and security authority credentials."
        primaryAction={{ label: "Guard Shifts", href: "/supervisor/team/shifts" }}
        secondaryAction={{ label: "Supervisory Desk", href: "/supervisor" }}
      />
      <ProfileView />
    </div>
  );
}
