"use client";

import { CampusStatusBar } from "@/components/admin/CampusStatusBar";
import { StudentInfographics } from "@/components/admin/StudentInfographics";
import { UserManagementPanel } from "@/components/admin/UserManagementPanel";
import { AuthGuard } from "@/components/shared/AuthGuard";

export default function AdminStudentsPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <div className="min-h-screen bg-[var(--bg)]">
        <CampusStatusBar />
        <div className="space-y-6 p-6">
          <StudentInfographics />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[var(--text-muted)]">
                Student roster — suspend / activate, credential resets, and bulk import scoped to students
              </p>
            </div>
          </div>
          <UserManagementPanel initialRole="student" role="student" />
        </div>
      </div>
    </AuthGuard>
  );
}
