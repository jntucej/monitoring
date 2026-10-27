import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { SysAdminShell } from "./SysAdminShell";

export const metadata: Metadata = NOINDEX_METADATA;

export default function SysAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SysAdminShell>{children}</SysAdminShell>;
}
