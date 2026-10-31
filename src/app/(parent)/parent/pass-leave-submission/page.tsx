"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Ticket } from "lucide-react";

export default function ParentPassLeaveSubmissionPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Ticket className="w-8 h-8" />}
        title="Submit Pass / Leave"
        description="Initiate or approve leave and outpass requests on behalf of your ward."
      />
    </div>
  );
}
