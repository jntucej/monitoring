import { redirect } from "next/navigation";

// Merged into the single notifications feed.
export default function AlertsRedirect() {
  redirect("/student/notifications");
}
