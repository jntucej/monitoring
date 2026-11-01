import { redirect } from "next/navigation";

// Consolidated into the 3-surface visitor model (status home / visit / history).
export default function VisitorRedirect() {
  redirect("/visitor/visit");
}
