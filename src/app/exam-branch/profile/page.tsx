"use client";

import { StandardRoleProfilePage } from "@/components/shared/profile/StandardRoleProfilePage";

export default function ExamBranchProfilePage() {
  return (
    <StandardRoleProfilePage
      roleLabel="Exam Branch"
      roleKey="exam_branch"
      homeHref="/exam-branch"
    />
  );
}
