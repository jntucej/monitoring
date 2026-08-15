import { DigitalIdCard } from "@/components/student/DigitalIdCard";
import { RecentActivity } from "@/components/student/RecentActivity";
import { ActivePasses } from "@/components/student/ActivePasses";

export default function StudentDashboardPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <DigitalIdCard />
      </div>
      <div className="lg:col-span-2 space-y-6">
        <RecentActivity />
        <ActivePasses />
      </div>
    </div>
  );
}
