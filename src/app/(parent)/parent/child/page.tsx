import { ChildStatus } from "@/components/parent/ChildStatus";
import { ChildActivity } from "@/components/parent/ChildActivity";

export default function ParentChildPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Child Details</h1>
        <p className="text-[var(--text-muted)]">View your child's status and activity</p>
      </div>

      <ChildStatus />

      <ChildActivity />
    </div>
  );
}