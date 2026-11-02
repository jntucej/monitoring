import { redirect } from "next/navigation";

export default function PrincipalPendingRedirect() {
  redirect("/principal/approvals");
}
