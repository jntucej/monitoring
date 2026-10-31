import { redirect } from "next/navigation";

export default function ResponseIndexPage() {
  redirect("/supervisor/response/escalations");
}
