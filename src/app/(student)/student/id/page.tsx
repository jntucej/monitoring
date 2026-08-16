"use client";
import { useEffect, useState } from "react";
import { DigitalIdCard } from "@/components/student/DigitalIdCard";

export default function StudentIdPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Digital ID Card</h1>
        <p className="text-[var(--text-muted)]">Show this card at the gate for scanning</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DigitalIdCard />
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold mb-3">ID Card Info</h3>
          <ul className="text-sm text-[var(--text-muted)] space-y-2">
            <li>• Show this screen to the gate operator.</li>
            <li>• The operator scans the QR code to log your entry/exit.</li>
            <li>• Photo verification prevents proxy scanning.</li>
            <li>• If the QR is damaged, the operator can enter your roll manually.</li>
            <li>• For replacement, contact the admin office.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
