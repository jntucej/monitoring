import { ChildStatus } from "@/components/parent/ChildStatus";
import { ChildActivity } from "@/components/parent/ChildActivity";
import { RequestPassForm } from "@/components/parent/RequestPassForm";

export default function ParentDashboardPage() {
  return (
    <div className="space-y-6">
      <ChildStatus />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChildActivity />
        <RequestPassForm />
      </div>
    </div>
  );
}
