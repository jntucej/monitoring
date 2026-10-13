import { redirect } from "next/navigation";

/**
 * Spec-named alias — keeps deep links (bookmarks, role menus) working.
 * The canonical section is /admin/reports.
 */
export default function AdminApplicationReportsAliasPage() {
  redirect("/admin/reports");
}
