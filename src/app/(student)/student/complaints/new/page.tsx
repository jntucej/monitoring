// src/app/(student)/student/complaints/new/page.tsx
"use client";
import { ComplaintForm } from "@/components/complaints/ComplaintForm";
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <h1 className="text-2xl font-semibold">New Complaint</h1>
      <ComplaintForm />
    </div>
  );
}
