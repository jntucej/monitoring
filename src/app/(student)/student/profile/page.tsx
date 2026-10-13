export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default function StudentProfileRedirect() {
  redirect("/student?tab=profile");
}
