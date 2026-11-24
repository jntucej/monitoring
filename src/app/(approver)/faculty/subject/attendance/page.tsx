"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ClipboardList } from "lucide-react";

export default function SubjectFacultyAttendancePage() {
  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <ContextSituationBar
        roleLabel="Subject Faculty"
        purpose="Record and track lecture attendance and student presence across subject sections."
        contextLabel="Subject Attendance"
        statusTone="info"
        statusSummary="Select your course session to submit or audit subject attendance rosters."
        primaryAction={{ label: "My Classes", href: "/faculty/subject/classes" }}
        secondaryActions={[
          { label: "Subject Home", href: "/faculty/subject" },
          { label: "Faculty Home", href: "/faculty" },
        ]}
      />
      <EmptyState
        icon={<ClipboardList className="size-6" />}
        title="Subject Attendance"
        description="Record and track subject class attendance."
      />
    </div>
  );
}
