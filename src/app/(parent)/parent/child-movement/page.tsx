import { redirect } from "next/navigation";

// Consolidated into the guardian portal. The live movement log lives at
// /guardian/movement-info; redirect here so the stale slug keeps working.
export default function ParentChildMovementRedirect() {
  redirect("/guardian/movement-info");
}
