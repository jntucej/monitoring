"use client";

import { Lightbulb } from "lucide-react";

export function InsightCard({
  facultyNeedsAttention,
  pendingApprovals,
  departmentRank,
  totalDepts,
}: {
  facultyNeedsAttention: number;
  pendingApprovals: number;
  departmentRank: number;
  totalDepts: number;
}) {
  let title = "Your department today";
  let body = "Clear approvals to unlock insights about your department.";

  if (facultyNeedsAttention > 0) {
    title = `${facultyNeedsAttention} faculty need a check-in`;
    body = `Students show up when faculty do. Reaching out to the absent faculty today strengthens your department's reliability — and student outcomes follow.`;
  } else if (pendingApprovals > 0) {
    title = `${pendingApprovals} request${pendingApprovals === 1 ? "" : "s"} between you and a clear desk`;
    body = `Every approval you clear is one student closer to their exam, their leave, or their pass. Department approval time is the second-largest source of student wait time in the college.`;
  } else if (departmentRank <= 3 && totalDepts > 0) {
    title = `Your department is #${departmentRank} today`;
    body = `Top ${departmentRank} of ${totalDepts} departments. The consistency your faculty show is the reason. This is the moment to make a small investment in the next tier — a note of appreciation to the team, or a review of open escalations.`;
  } else if (totalDepts > 0) {
    title = `Department at #${departmentRank} of ${totalDepts}`;
    body = `There's room to grow. The gap between you and the top department is closing when faculty attendance is high and approvals are cleared fast. Focus on the daily rhythm.`;
  }

  return (
    <section className="rounded-2xl border border-[var(--action-info)]/30 bg-[var(--action-info)]/5 p-4 sm:p-5">
      <header className="mb-2 flex items-center gap-2">
        <Lightbulb className="size-4 text-[var(--action-info)]" />
        <h2 className="text-sm font-semibold text-[var(--action-info)]">{title}</h2>
      </header>
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{body}</p>
    </section>
  );
}
