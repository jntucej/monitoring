import { AuthGuard } from "@/components/shared/AuthGuard";
import { PermissionList } from "@/components/approver/PermissionList";
import { CampusStatusCards } from "@/components/admin/CampusStatusCards";
import { ShieldCheck, AlertTriangle, Users, TrendingUp } from "lucide-react";

export default function PrincipalDashboardPage() {
  return (
    <AuthGuard allowedRoles={["principal"]}>
      <div className="space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Pending approvals, hostel/exam escalations, campus occupancy, alerts */}
        </div>

        {/* Pending permission approvals (principal is final approver for exams) */}
        <PermissionList
          title="Pending Approvals"
          workflowType="exam"
          currentStage="principal"
          fetchUrl="/api/permissions?workflow_type=exam&stage=principal&status=PENDING"
          allowForward={false}
        />
      </div>
    </AuthGuard>
  );
}
