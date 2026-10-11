import { redirect } from "next/navigation";

// The warden dashboard lives under the approver shell (sidebar + nav).
// /warden kept as a stable redirect so old links/bookmarks still work.
export default function WardenRedirect() {
  redirect("/approver/warden");
}
