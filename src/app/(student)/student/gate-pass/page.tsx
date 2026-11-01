import { redirect } from "next/navigation";

// Duplicate gate-pass surface → canonical passes page (which has the QR).
export default function GatePassRedirect() {
  redirect("/student/passes");
}
