import { PageHeader } from "@/components/shared/PageHeader";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { HostelAdminFallback } from "@/components/approver/HostelAdminFallback";

export default function HostelManagerAllocationPage() {
  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Bed Allocation" subtitle="View hostel block capacity and resident assignments." />
      <ContextSituationBar
        contextLabel="Hostel Allocation"
        statusTone="info"
        summary="Bed assignments are managed centrally by Campus Admin. You can inspect live block occupancy and resident lists here."
        primaryAction={{ label: "View Rooms & Occupancy", href: "/hostel-manager/rooms" }}
        secondaryAction={{ label: "View Residents", href: "/hostel-manager/residents" }}
      />
      <HostelAdminFallback
        feature="Bed allocation"
        reason="Bed assignments are made from the admin console. This page will show a grid once the allocation API is available."
        adminHref="/admin/students"
        adminLabel="Open student roster"
      />
    </div>
  );
}
