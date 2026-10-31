import { redirect } from "next/navigation";

// Consolidated into the guardian portal. /guardian/contact-info owns
// emergency-contact + residential-address editing; redirect the stale slug.
export default function ParentContactInfoRedirect() {
  redirect("/guardian/contact-info");
}
