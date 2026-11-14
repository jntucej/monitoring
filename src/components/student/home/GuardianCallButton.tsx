"use client";

import { Phone } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { Skeleton } from "@/components/ui/skeleton";

// The guardian endpoint returns guardian links with the phone number
// encrypted at rest (guardian_phone_last4 is all the UI is allowed to
// render), so the tel: link only appears when a plaintext phone exists.
interface GuardianRow {
  guardianName: string | null;
  phone?: string | null;
}

export function GuardianCallButton() {
  const { data, loading } = useApiResource<{
    guardians?: GuardianRow[];
  }>("/api/student/guardian", {
    ttlMs: 5 * 60_000,
  });
  const g = data?.guardians?.[0];
  if (loading) return <Skeleton className="h-9 w-32" />;
  if (!g?.phone) return null;
  return (
    <a
      href={`tel:${g.phone}`}
      className="inline-flex items-center gap-1 rounded-md border border px-3 py-2 text-sm text-secondary"
    >
      <Phone className="h-4 w-4" aria-hidden /> Call {g.guardianName ?? "guardian"}
    </a>
  );
}
