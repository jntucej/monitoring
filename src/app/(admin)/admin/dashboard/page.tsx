export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default function AdminDashboardRedirect() {
  redirect("/admin");
}