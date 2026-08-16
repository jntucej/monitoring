import { DigitalIdCard } from "@/components/student/DigitalIdCard";
import { ActivePasses } from "@/components/student/ActivePasses";
import { RecentActivity } from "@/components/student/RecentActivity";

export default function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student Dashboard</h1>
        <p className="text-[var(--text-muted)]">Your digital ID and campus activity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DigitalIdCard />
        <div className="space-y-6">
          <ActivePasses />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}