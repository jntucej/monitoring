import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { ParentShell } from "./ParentShell";

export const metadata: Metadata = NOINDEX_METADATA;

export default function ParentConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ParentShell>{children}</ParentShell>;
}
