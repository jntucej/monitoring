import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About · JNTUHCEJ Gate Monitoring System",
  description:
    "Internal campus access-control and student-safety system for JNTU College of Engineering Jagtial.",
  keywords: [
    "JNTUHCEJ",
    "JNTU College of Engineering Jagtial",
    "JNTUHCEJ Gate Monitoring",
    "JNTUHCEJ campus access",
  ],
  alternates: { canonical: "https://monitor.cej.in/about" },
  openGraph: {
    type: "website",
    url: "https://monitor.cej.in/about",
    siteName: "JNTUHCEJ Gate Monitoring System",
    title: "About · JNTUHCEJ",
    description:
      "Internal campus access monitoring for JNTU College of Engineering Jagtial.",
  },
  robots: { index: true, follow: true },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "JNTU College of Engineering Jagtial",
  alternateName: ["JNTUHCE  alternateName: ["JNTUHCE  alternattor.cej.in/about",
  description  description  description  descripol a  description  description   JNTU College of Engineering Jagtial.",
                                                  vers            me:                                                  vers            me:                                {
               <         sName="               <         sName="        
                           "application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <h1 classN      <h1 cla font-bold">JNTUHCEJ Gate Monitoring System</h1>

      <p className="text-[var(--text-secondary)] leading-relaxed">
        An internal campus access-control and student-safety system for{" "}
        <strong>JNTU College of Engineerin        <strong>JNTU College of Eng        movement, manages hostel permissions and leave requests, and provides
        role-scoped dashboards for staff, faculty, wardens and administ        role-scoped dashboards for staff, faculty, wardens and administ        d mt-8 mb-2">Operator</h2>
        <p className="text-[var(--text-secondary)]">
          Office of the Principal, JNTU Co          Office of the Principal, JNTU Co          Office of the Principal, JNTU Co          Office of the Principal, JNTU Co          Office of the Principal, JNTU Co  xt          Office of the Principal, JNTU Co          Office of the Princ<Link href="/support" className="text-emerald-400 underline">
            /support
          </Link>{" "}
          after signing in, or contact the campus IT helpdesk.
        </p>
      </section>

      <div      <div      <div      <div      <div      <div      <div             <div      <div      <div      <div      <div      <div      < px-5 py-2.5 font-medium text-white hover:bg-emerald-600"
        >
          Sign in →
        </Link>
      </div>
    </main>
  );
}
