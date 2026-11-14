"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { ClipboardList } from "lucide-react";

export default function SubjectFacultyAttendancePage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<ClipboardList className="size-6" />}
        title="Subject Attendance"
        description="Record and track subject class attendance."
      />
    </div>
  );
}
