// Consolidated into the guardian portal. /guardian/child-attendance is the
// single source of truth; re-export so nav links resolve to the real page
// (a redirect would also work, but re-export keeps the URL stable for
// deep links and bookmarks).
export { default } from "@/app/(approver)/guardian/child-attendance/page";
