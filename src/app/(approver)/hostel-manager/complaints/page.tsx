// src/app/(approver)/hostel-manager/complaints/page.tsx
"use client";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";
export default function Page() {
  return <ComplaintConsole role="hostel_manager" basePath="/hostel-manager/complaints" title="Hostel Manager Complaint Queue" />;
}
