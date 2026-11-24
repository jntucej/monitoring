"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { BookOpen } from "lucide-react";

export default function SubjectFacultyClassesPage() {
  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <ContextSituationBar
        roleLabel="Subject Faculty"
        purpose="Review assigned course modules, batch distributions, and syllabus progression."
        contextLabel="Assigned Courses"
        statusTone="info"
        statusSummary="View registered classes, syllabus milestones, and assigned laboratory sections."
        primaryAction={{ label: "Mark Attendance", href: "/faculty/subject/attendance" }}
        secondaryActions={[
          { label: "Subject Home", href: "/faculty/subject" },
          { label: "Faculty Home", href: "/faculty" },
        ]}
      />
      <EmptyState
        icon={<BookOpen className="size-6" />}
        title="My Classes"
        description="Assigned courses, batches, and syllabus progress."
      />
    </div>
  );
}
