import { PageHeader } from "@/components/shared/PageHeader";
import { HostelAdminFallback } from "@/components/approver/HostelAdminFallback";

export default function HostelManagerRoomsPage() {
  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Rooms" subtitle="Block and room occupancy." />
      <HostelAdminFallback
        feature="Room occupancy"
        reason="Block and room data is available in the admin student roster until the hostel-manager rooms API lands."
        adminHref="/admin/students"
        adminLabel="Open student roster"
      />
    </div>
  );
}
