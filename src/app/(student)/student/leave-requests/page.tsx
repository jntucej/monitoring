import { redirect } from "next/navigation";

// Legacy leave flow → canonical request form.
export default function LeaveRequestsRedirect() {
  redirect("/student/permissions/new");
}
