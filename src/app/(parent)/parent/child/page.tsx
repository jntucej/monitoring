export const dynamic = "force-dynamic";

import { ChildStatus } from "@/components/parent/ChildStatus";
import { ChildActivity } from "@/components/parent/ChildActivity";

export default function ParentChildPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Child Details</p>
        <p className="text-[var(--text-muted)]">View your child's status and activity</p>
      </div>

      <ChildStatus />

      <ChildActivity />
    </div>
  );
}