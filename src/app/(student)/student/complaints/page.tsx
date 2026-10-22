// src/app/(student)/student/complaints/page.tsx
"use client";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";
export default function Page() {
  return <ComplaintConsole role="student" basePath="/student/complaints" title="My Complaints" />;
}
