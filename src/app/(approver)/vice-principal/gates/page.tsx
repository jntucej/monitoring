import { redirect } from "next/navigation";

/**
 * Legacy path alias — keeps deep links (bookmarks, role menus) working.
 * The spec-named section is the source of truth.
 */
export default function VpLegacyAliasPage() {
  redirect("/vice-principal/hostel-security-summaries");
}
