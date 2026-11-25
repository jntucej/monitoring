"use client";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { AnnouncementsManager } from "@/components/admin/AnnouncementsManager";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AnnouncementsPage() {
  return (
    
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Publish, schedule, and manage campus-wide notices"
        why="Every notice you post appears instantly in user inboxes and the campus home screen."
        contextLabel="Publish, schedule, and manage campus-wide notices"
        statusSummary="Review current publish, schedule, and manage campus-wide notices state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
        <PageHeader
          title="Campus Announcements"
          subtitle="Publish, schedule, and manage campus-wide notices"
        />
        <WidgetBoundary title="Announcements">
          <AnnouncementsManager />
        </WidgetBoundary>
      </div>
    
    

  );
}
