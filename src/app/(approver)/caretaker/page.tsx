// src/app/(approver)/caretaker/page.tsx — caretaker queue (complaints)
"use client";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";

export default function Page() {
  return <ComplaintConsole role="caretaker" basePath="/caretaker/complaints" title="Caretaker Complaint Queue" />;
}
