import { redirect } from "next/navigation";

// Legacy pass/absence flow → canonical request form.
export default function PassApplicationRedirect() {
  redirect("/student/permissions/new");
}
