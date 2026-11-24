import { PageHeader } from "@/components/shared/PageHeader";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { HostelAdminFallback } from "@/components/approver/HostelAdminFallback";

export default function HostelManagerAllocationPage() {
  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Bed Allocation" subtitle="View hostel block capacity and resident assignments." />
      <ContextSituationBar
        roleLabel="Hostel Manager"
        purpose="Monitor block capacity and bed allocation status, and reconcile student resident assignments"
        contextLabel="Hostel Bed Allocation"
        statusSummary="Bed assignments are managed centrally by Campus Admin. Inspect live block occupancy and resident lists here."
        severity="info"
        primaryAction={{ label: "View Rooms & Occupancy", href: "/hostel-manager/rooms" }}
        secondaryActions={[
          { label: "View Residents", href: "/hostel-manager/residents" },
          { label: "Resource Management", href: "/hostel-manager/resource-management" },
        ]}
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
