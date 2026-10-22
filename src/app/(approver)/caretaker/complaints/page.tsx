// src/app/(approver)/caretaker/complaints/page.tsx
"use client";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";
export default function Page() {
  return <ComplaintConsole role="caretaker" basePath="/caretaker/complaints" title="Caretaker Complaint Queue" />;
}
