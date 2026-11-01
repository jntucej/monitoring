import { redirect } from "next/navigation";

// Duplicate request-tracking surface → canonical permissions list.
export default function RequestTrackingRedirect() {
  redirect("/student/permissions");
}
