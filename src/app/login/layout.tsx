import type { Metadata } from "next";
import { COLLEGE, collegeCanonical } from "@/lib/college-config";

export const metadata: Metadata = {
  title: `Sign in | ${COLLEGE.shortName}`,
  description: `Sign in to the ${COLLEGE.officialName} campus portal for students, parents, faculty, staff and administrators.`,
  alternates: { canonical: collegeCanonical("/login") },
  robots: { index: true, follow: true },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
