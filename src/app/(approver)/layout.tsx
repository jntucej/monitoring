import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { ApproverShell } from "./ApproverShell";

export const metadata: Metadata = NOINDEX_METADATA;

export default function ApproverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ApproverShell>{children}</ApproverShell>;
}
