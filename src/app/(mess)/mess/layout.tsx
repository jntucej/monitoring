import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { MessShell } from "./MessShell";

export const metadata: Metadata = NOINDEX_METADATA;

export default function MessConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MessShell>{children}</MessShell>;
}
