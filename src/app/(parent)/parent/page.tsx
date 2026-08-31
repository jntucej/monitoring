import { ChildStatus } from "@/components/parent/ChildStatus";
import { ChildActivity } from "@/components/parent/ChildActivity";
import { RequestPassForm } from "@/components/parent/RequestPassForm";

export default function ParentDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          <span className="sm:hidden">👨‍👩‍👧</span>
          <span className="hidden sm:inline">👨‍👩‍👧 Parent Dashboard</span>
        </h1>
        <p className="text-[var(--text-muted)] hidden sm:block">Monitor your child's campus activity</p>
      </div>

      <ChildStatus />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChildActivity />
        <RequestPassForm />
      </div>
    </div>
  );
}