// Consolidated into the guardian portal. /guardian/movement-info is the
// single source of truth for the live movement log; re-export so the stale
// /parent/child-movement slug keeps working.
export { default } from "@/app/(approver)/guardian/movement-info/page";
