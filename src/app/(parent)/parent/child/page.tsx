
import { ChildStatus } from "@/components/parent/ChildStatus";
import { ChildActivity } from "@/components/parent/ChildActivity";

export default function ParentChildPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <div>
        <p className="text-2xl font-bold">Child Details</p>
        <p className="text-[var(--text-muted)]">View your child's status and activity</p>
      </div>

      <ChildStatus />

      <ChildActivity />
    </div>
  );
}