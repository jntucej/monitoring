import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
