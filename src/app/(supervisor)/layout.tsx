import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { SupervisorShell } from "./SupervisorShell";

export const metadata: Metadata = NOINDEX_METADATA;

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SupervisorShell>{children}</SupervisorShell>;
}
