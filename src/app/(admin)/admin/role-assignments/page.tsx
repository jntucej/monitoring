import { redirect } from "next/navigation";

/**
 * Spec-named alias — keeps deep links (bookmarks, role menus) working.
 * The canonical section is /admin/roles.
 */
export default function AdminRoleAssignmentsAliasPage() {
  redirect("/admin/roles");
}
