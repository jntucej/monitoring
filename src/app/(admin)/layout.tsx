import { AuthGuard } from "@/components/shared/AuthGuard";

export const metadata = {
  title: "Admin Dashboard",
  description: "Campus dashboard and live telemetry"
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
