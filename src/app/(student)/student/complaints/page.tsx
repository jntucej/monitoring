"use client";
// src/app/(student)/student/complaints/page.tsx
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";
export default function Page() {
  return <ComplaintConsole role="student" basePath="/student/complaints" title="My Complaints" />;
}
