"use client";

import { Suspense, use } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";
import Link from "next/link";

/**
 * /principal/respond/complaints/[id] — single complaint detail page.
 */
function ComplaintDetailPageInner({ id }: { id: string }) {
  return (
    <div className="px-4 sm:px-6 py-6">
      <Link href="/principal/respond/complaints" className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4">
        ← Back to complaints
      </Link>
      <ComplaintConsole role="principal" basePath="/principal/respond/complaints" title={`Complaint ${id}`} />
    </div>
  );
}

export default function ComplaintDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <ComplaintDetailPageInner id={id} />
    </Suspense>
  );
}
