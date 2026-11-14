"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { BookOpen } from "lucide-react";

export default function SubjectFacultyClassesPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<BookOpen className="size-6" />}
        title="My Classes"
        description="Assigned courses, batches, and syllabus progress."
      />
    </div>
  );
}
