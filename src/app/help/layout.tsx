import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help · JNTUHCEJ",
  description:
    "User guide for the JNTUHCEJ Gate Monitoring System — role-aware help articles for students, faculty, hostel staff, and administrators.",
  robots: { index: false, follow: false },
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
