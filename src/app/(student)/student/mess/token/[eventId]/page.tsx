"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MyEventToken } from "@/components/mess/MyEventToken";

export default function MyTokenPage() {
  const params = useParams<{ eventId: string }>();
  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
      <Link href="/student/mess" className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)]">
        <ArrowLeft className="h-4 w-4" /> Back to mess
      </Link>
      <PageHeader title="My meal token" subtitle="Show this QR — or read out the roll + code at the counter." />
      {params?.eventId && <MyEventToken eventId={params.eventId} />}
    </div>
  );
}
