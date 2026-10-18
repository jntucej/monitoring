import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "First-time setup · JNTUHCEJ",
  robots: { index: false, follow: false },
};

export default function BootstrapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
