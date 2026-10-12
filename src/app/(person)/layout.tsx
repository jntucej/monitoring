import { AuthGuard } from "@/components/shared/AuthGuard";
import type { ReactNode } from "react";

export const metadata = {
  title: "Person Portal",
  description: "Campus person portal"
};

export default function PersonLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedRoles={["student", "faculty", "staff", "worker", "visitor", "parent", "guardian", "admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
