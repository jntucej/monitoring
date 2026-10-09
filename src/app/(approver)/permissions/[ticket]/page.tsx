"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { PermissionDetailPanel } from "@/components/approver/PermissionDetailPanel";

export default function PermissionTicketPage() {
  const params = useParams();
  const router = useRouter();
  const ticket = typeof params?.ticket === "string" ? params.ticket : Array.isArray(params?.ticket) ? params.ticket[0] : "";

  if (!ticket) {
    return (
      <div className="p-6 text-center text-[var(--text-muted)]">
        No ticket specified.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <PermissionDetailPanel
        ticket={ticket}
        isStandalonePage
        onClose={() => router.back()}
      />
    </div>
  );
}
