"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Ticket } from "lucide-react";

export default function ParentPassLeaveSubmissionPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <EmptyState
        icon={<Ticket className="w-8 h-8" />}
        title="Submit Pass / Leave"
        description="Initiate or approve leave and outpass requests on behalf of your ward."
      />
    </div>
  );
}
