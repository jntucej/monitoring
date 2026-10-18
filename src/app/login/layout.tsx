import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in · JNTUHCEJ",
  description:
    "Sign in to JNTUHCEJ Gate Monitoring System. Students, faculty, staff, wardens and admins.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
