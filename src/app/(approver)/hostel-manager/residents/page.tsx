import { PageHeader } from "@/components/shared/PageHeader";
import { HostelAdminFallback } from "@/components/approver/HostelAdminFallback";

export default function HostelManagerResidentsPage() {
  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Residents" subtitle="Students currently allocated to your blocks." />
      <HostelAdminFallback
        feature="Resident roster"
        reason="The full resident roster is available in the admin console. This view will be enabled once the resident-list API lands."
        adminHref="/admin/students"
        adminLabel="Open student roster"
      />
    </div>
  );
}
