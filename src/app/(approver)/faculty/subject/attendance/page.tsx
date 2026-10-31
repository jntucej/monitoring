"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { ClipboardList } from "lucide-react";

export default function SubjectFacultyAttendancePage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<ClipboardList className="w-8 h-8" />}
        title="Subject Attendance"
        description="Record and track subject class attendance."
      />
    </div>
  );
}
