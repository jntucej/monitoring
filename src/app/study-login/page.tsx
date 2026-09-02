import { redirect } from "next/navigation";

/**
 * Study Portal login removed — resources are open for now.
 * Kept as a redirect so old links/bookmarks to /study-login still land on /study.
 */
export default function StudyLoginPage() {
  redirect("/study");
}
