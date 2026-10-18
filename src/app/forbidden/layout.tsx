import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Access denied · JNTUHCEJ",
  robots: { index: false, follow: false },
};

export default function ForbiddenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
