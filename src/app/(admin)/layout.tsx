import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { AdminShell } from "./AdminShell";

export const metadata: Metadata = NOINDEX_METADATA;

export default function AdminSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
