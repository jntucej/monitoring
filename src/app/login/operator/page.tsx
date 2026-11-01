import { redirect } from "next/navigation";

/** /login/operator → operator sign-in, then lands on the console. */
export default function OperatorLoginRedirect() {
  redirect("/login?role=operator");
}
