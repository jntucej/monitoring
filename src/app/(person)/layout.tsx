import { AuthGuard } from "@/components/shared/AuthGuard";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;

export default function PersonLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedRoles={["student", "faculty", "staff", "worker", "visitor", "parent", "guardian", "admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
