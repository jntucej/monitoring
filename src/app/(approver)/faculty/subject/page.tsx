"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { LayoutDashboard } from "lucide-react";

export default function SubjectFacultyTodayPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<LayoutDashboard className="w-8 h-8" />}
        title="Subject Faculty Today"
        description="Daily teaching schedule and class overview."
      />
    </div>
  );
}
