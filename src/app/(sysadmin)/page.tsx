import { UserManagement } from "@/components/sysadmin/UserManagement";
import { GateManagement } from "@/components/sysadmin/GateManagement";
import { SystemSettings } from "@/components/sysadmin/SystemSettings";

export default function SysadminPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-6">
        <UserManagement />
        <GateManagement />
      </div>
      <SystemSettings />
    </div>
  );
}
