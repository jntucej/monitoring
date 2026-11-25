"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ProfileView } from "../_shared/ProfileView";

export default function ProfilePage() {
  return (
    <div className="space-y-4 min-w-0">
      <ContextSituationBar
        roleLabel="Head of Department"
        purpose="Review departmental leadership credentials, role delegations, and administrative settings."
        why="Keeping your department head profile and signing delegations current avoids authorization delays in campus workflows."
        contextLabel="HOD Profile"
        statusTone="info"
        statusSummary="Manage your departmental administrator profile and account configurations."
        primaryAction={{ label: "Today Overview", href: "/hod/home" }}
        secondaryActions={[
          { label: "Approvals Queue", href: "/hod" },
          { label: "Department Reports", href: "/hod/reports" },
        ]}
      />
      <ProfileView />
    </div>
  );
}
