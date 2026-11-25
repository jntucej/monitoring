"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ClassesView } from "../_shared/ClassesView";

export default function ClassesPage() {
  return (
    <div className="space-y-4 min-w-0">
      <ContextSituationBar
        roleLabel="Head of Department"
        purpose="Review departmental classes, batch allocations, and class teacher assignments."
        why="Reviewing class allocations ensures balanced section cohorts and clear mentorship ownership across batches."
        contextLabel="Department Classes"
        statusTone="info"
        statusSummary="Monitor class section capacities, course tracks, and teacher assignments."
        primaryAction={{ label: "Today Overview", href: "/hod/home" }}
        secondaryActions={[
          { label: "Faculty Directory", href: "/hod/faculty/directory" },
          { label: "Student Directory", href: "/hod/students" },
        ]}
      />
      <ClassesView />
    </div>
  );
}
