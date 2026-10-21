import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { OperatorShell } from "./OperatorShell";

export const metadata: Metadata = NOINDEX_METADATA;

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OperatorShell>{children}</OperatorShell>;
}
