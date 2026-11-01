import { PageHeader } from "@/components/shared/PageHeader";
import { HostelAdminFallback } from "@/components/approver/HostelAdminFallback";

export default function HostelManagerAllocationPage() {
  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Bed Allocation" subtitle="Assign students to beds." />
      <HostelAdminFallback
        feature="Bed allocation"
        reason="Bed assignments are made from the admin console. This page will show a grid once the allocation API is available."
        adminHref="/admin/students"
        adminLabel="Open student roster"
      />
    </div>
  );
}
