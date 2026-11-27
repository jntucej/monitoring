"use client";

import { ScopedHierarchyPage } from "@/components/dashboard/ScopedHierarchyPage";

export default function ExamBranchHierarchyPage() {
  return (
    <ScopedHierarchyPage
      allowedRoles={["exam_branch", "oie", "principal", "admin", "sysadmin"]}
      roleLabel="Exam Branch"
      homeHref="/exam-branch"
      area="exam"
    />
  );
}
