import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { VisitorShell } from "./VisitorShell";

export const metadata: Metadata = NOINDEX_METADATA;

export default function VisitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VisitorShell>{children}</VisitorShell>;
}
