import { GateManagement } from "@/components/sysadmin/GateManagement";
import { UserManagement } from "@/components/sysadmin/UserManagement";
import { SystemSettings } from "@/components/sysadmin/SystemSettings";

export default function SysadminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Administration</h1>
        <p className="text-[var(--text-muted)]">Manage gates, users, and system settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GateManagement />
        <UserManagement />
      </div>

      <SystemSettings />
    </div>
  );
}