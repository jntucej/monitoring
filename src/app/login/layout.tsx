import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Gate Monitoring",
  description: "Login to the Gate Monitoring System",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="min-h-[100dvh] flex flex-col">{children}</main>;
}
