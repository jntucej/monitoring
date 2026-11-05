"use client";
// src/app/(approver)/deputy-warden/complaints/page.tsx
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";
export default function Page() {
  return <ComplaintConsole role="deputy_warden" basePath="/deputy-warden/complaints" title="Deputy Warden Complaint Queue" />;
}
