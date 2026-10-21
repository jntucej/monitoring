// src/app/(approver)/principal/complaints/page.tsx
"use client";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";
export default function Page() {
  return <ComplaintConsole role="principal" basePath="/principal/complaints" title="Principal Complaint Queue" />;
}
