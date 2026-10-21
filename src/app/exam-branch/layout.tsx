import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { ExamBranchShell } from "./ExamBranchShell";

export const metadata: Metadata = NOINDEX_METADATA;

export default function ExamBranchConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ExamBranchShell>{children}</ExamBranchShell>;
}
