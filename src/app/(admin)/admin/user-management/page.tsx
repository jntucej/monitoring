import { redirect } from "next/navigation";

/**
 * Spec-named alias — keeps deep links (bookmarks, role menus) working.
 * The canonical section is /admin/users.
 */
export default function AdminUserManagementAliasPage() {
  redirect("/admin/users");
}
