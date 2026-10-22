import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { StudentShell } from "./StudentShell";

export const metadata: Metadata = NOINDEX_METADATA;

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentShell>{children}</StudentShell>;
}
