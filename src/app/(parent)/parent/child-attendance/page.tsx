"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "lucide-react";

export default function ParentChildAttendancePage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Users className="w-8 h-8" />}
        title="Child Attendance"
        description="View class and hostel attendance records for your child."
      />
    </div>
  );
}
