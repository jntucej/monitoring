"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { AnnouncementsManager } from "@/components/admin/AnnouncementsManager";

export default function AnnouncementsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <AnnouncementsManager />
      </div>
    </AuthGuard>
  );
}
