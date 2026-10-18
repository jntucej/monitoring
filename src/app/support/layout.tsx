import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support · JNTUHCEJ",
  description:
    "File a support ticket for the JNTUHCEJ Gate Monitoring System. IT helpdesk for account, access, and technical issues.",
  robots: { index: false, follow: false },
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
