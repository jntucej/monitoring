import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { ExamSuperintendentShell } from "./ExamSuperintendentShell";

export const metadata: Metadata = NOINDEX_METADATA;

export default function ExamSuperintendentConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ExamSuperintendentShell>{children}</ExamSuperintendentShell>;
}
