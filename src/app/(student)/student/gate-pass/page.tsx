import { redirect } from "next/navigation";

// Duplicate passes surface → canonical passes list.
export default function GatePassRedirect() {
  redirect("/student/passes");
}
