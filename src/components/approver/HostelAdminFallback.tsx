import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface HostelAdminFallbackProps {
  feature: string;
  reason?: string;
  adminHref?: string;
  adminLabel?: string;
}

export function HostelAdminFallback({
  feature,
  reason = "This view will be enabled once the hostel-manager API lands. In the meantime, use the admin roster.",
  adminHref = "/admin/students",
  adminLabel = "Open admin roster",
}: HostelAdminFallbackProps) {
  return (
    <Card className="p-8 text-center max-w-md mx-auto">
      <Building2 className="size-6 mx-auto mb-3 text-text-muted" />
      <h3 className="font-semibold mb-2">{feature} is managed by admin</h3>
      <p className="text-sm text-text-muted mb-4">{reason}</p>
      <Link
        href={adminHref}
        className="inline-flex items-center gap-2 px-4 py-2 rounded bg-action-primary text-white text-sm hover:opacity-90"
      >
        {adminLabel} <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </Card>
  );
}
