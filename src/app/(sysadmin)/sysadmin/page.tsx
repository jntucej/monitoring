"use client";

import { SysAdminControlPanel } from "@/components/sysadmin/SysAdminControlPanel";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { LiveActivityFeed } from "@/components/shared/LiveActivityFeed";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import { CampusKnowledgeCentre } from "@/components/retention/CampusKnowledgeCentre";

export default function SysadminPage() {
  return (
    <div className="space-y-8">
      <SysAdminControlPanel />

      {/* Campus home & retention panels */}
      <PersonalizedCampusHome />
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <TaskContinuity />
        <RoleAnalytics />
      </div>
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <LiveActivityFeed />
        <CampusKnowledgeCentre />
      </div>
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <QuickActions />
        <NotificationCenter />
      </div>
    </div>
  );
}
