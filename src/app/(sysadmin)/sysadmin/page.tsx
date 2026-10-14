"use client";

import { SysAdminControlPanel } from "@/components/sysadmin/SysAdminControlPanel";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { LiveActivityFeed } from "@/components/shared/LiveActivityFeed";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import { CampusKnowledgeCentre } from "@/components/retention/CampusKnowledgeCentre";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";

export default function SysadminPage() {
  return (
    <div className="space-y-8">
      {/* Authority separation note */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 px-3 py-2 text-[11px] text-slate-500">
        Technical privileges in this console do not grant institutional pass approvals — those
        remain owned by the role approval desks.
      </div>

      <SysAdminControlPanel />

      <AttentionQueue />
      <ActivityTimeline />

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
