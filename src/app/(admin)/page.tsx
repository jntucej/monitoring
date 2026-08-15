import { StatCard } from "@/components/admin/StatCard";
import { EntryExitChart } from "@/components/admin/EntryExitChart";
import { StudentList } from "@/components/admin/StudentList";
import { Users, LogIn, LogOut, UserCheck } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Students" value="2,480" icon={Users} color="#3B82F6" />
        <StatCard label="Entries Today" value="857" icon={LogIn} color="#10B981" />
        <StatCard label="Exits Today" value="642" icon={LogOut} color="#EF4444" />
        <StatCard label="Students Inside" value="1,838" icon={UserCheck} color="#F59E0B" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <EntryExitChart />
        </div>
        <div className="lg:col-span-2">
          <StudentList />
        </div>
      </div>
    </div>
  );
}
