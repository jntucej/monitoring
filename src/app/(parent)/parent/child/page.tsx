export const dynamic = "force-dynamic";

import { ChildStatus } from "@/components/parent/ChildStatus";
import { ChildActivity } from "@/components/parent/ChildActivity";

export default function ParentChildPage() {
  return (
    <div className="space-y-6">
      <div>
<<<<<<< HEAD
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Child Details</p>
=======
        <p className="text-2xl font-bold">Child Details</p>
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
        <p className="text-[var(--text-muted)]">View your child's status and activity</p>
      </div>

      <ChildStatus />

      <ChildActivity />
    </div>
  );
}