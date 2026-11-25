"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MyEventToken } from "@/components/mess/MyEventToken";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function MyTokenPage() {
  const params = useParams<{ eventId: string }>();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <Link href="/student/mess" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm text-secondary">
        <ArrowLeft className="h-4 w-4" /> Back to mess
      </Link>
      <PageHeader title="My meal token" subtitle="Show this QR — or read out the roll + code at the counter." />
      <ContextSituationBar
        roleLabel="Student"
        purpose="Present meal token verification QR and authorization code for special event dining"
        contextLabel="Event Meal Redemption"
        severity="ok"
        statusPill="Active Token"
        statusSummary="Show this QR token to counter staff or read your student roll number for verification."
        why="Event meal tokens grant entry and special catering redemption at the counter during the scheduled event window."
        primaryAction={{ label: "Regular Tokens", href: "/student/mess/token" }}
        secondaryAction={{ label: "Mess Landing", href: "/student/mess" }}
      />
      {params?.eventId && <MyEventToken eventId={params.eventId} />}
    </div>
  );
}
