import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  robots: { index: false },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 space-y-6">
      <h1 className="text-3xl font-bold">JNTUHCEJ Gate Monitoring System</h1>

      <p className="text-[var(--text-secondary)] leading-relaxed">
        An internal campus access-control and student-safety system for
        <strong> JNTU College of Engineering Jagtial</strong>. It tracks
        gate movement, manages hostel permissions and leave requests, and
        provides role-scoped dashboards for staff, faculty, wardens and
        administrators.
      </p>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-2">Operator</h2>
        <p className="text-[var(--text-secondary)]">
          Office of the Principal, JNTU College of Engineering Jagtial.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-2">Support</h2>
        <p className="text-[var(--text-secondary)]">
          For account or access issues, file a ticket from{" "}
          <Link href="/support" className="text-emerald-400 underline">
            /support
          </Link>{" "}
          after signing in, or email the campus IT helpdesk.
        </p>
      </section>

      <div className="pt-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 font-medium text-white hover:bg-emerald-600"
        >
          Sign in →
        </Link>
      </div>
    </main>
  );
}
