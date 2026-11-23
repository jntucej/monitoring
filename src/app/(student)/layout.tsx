import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { SakugaPageShell } from "@/components/student/SakugaPageShell";

export const metadata: Metadata = NOINDEX_METADATA;

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SakugaPageShell>{children}</SakugaPageShell>;
}
