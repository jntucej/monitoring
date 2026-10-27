"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Crown,
  Users,
  Briefcase,
  Building2,
  ScanLine,
  ShieldCheck,
  Gavel,
  Settings,
} from "lucide-react";

/**
 * RoleMap — 8 permission-scoped role cards with a hover 3D tilt.
 *
 * Tilt is a ±6° spring-smoothed rotateX/rotateY driven by pointer
 * position (Framer motion values). It is disabled on coarse pointers
 * (mobile) and on low device tier (via the `data-home-tier` CSS + the
 * reduced flag). Enter reveal is a stagger of opacity + y only.
 *
 * Roles: Student, Parent, Faculty, Staff, Operator, Warden, Approver,
 * Admin — each with an icon, name and a one-line capability.
 */

interface Role {
  name: string;
  cap: string;
  href: string;
  Icon: typeof Crown;
}

const ROLES: Role[] = [
  {
    name: "Student",
    cap: "Digital ID, gate passes, permissions and attendance.",
    href: "/login?role=student",
    Icon: Crown,
  },
  {
    name: "Parent",
    cap: "Child status, movement timeline and pass requests.",
    href: "/login?role=parent",
    Icon: Users,
  },
  {
    name: "Faculty",
    cap: "Class attendance, subject permissions, student directory.",
    href: "/login?role=faculty",
    Icon: Briefcase,
  },
  {
    name: "Staff",
    cap: "Outpass approvals, room allocation, resident tickets.",
    href: "/login?role=hostel-manager",
    Icon: Building2,
  },
  {
    name: "Operator",
    cap: "Gate scan verification, manual entry, transactions.",
    href: "/login?role=operator",
    Icon: ScanLine,
  },
  {
    name: "Warden",
    cap: "Hostel oversight, outpass review, incident response.",
    href: "/login?role=warden",
    Icon: ShieldCheck,
  },
  {
    name: "Approver",
    cap: "Approval centre, delegated permissions, audit.",
    href: "/login?role=approver",
    Icon: Gavel,
  },
  {
    name: "Admin",
    cap: "Department analytics, RBAC, configuration, oversight.",
    href: "/login?role=admin",
    Icon: Settings,
  },
];

function TiltCard({ role, reduced, index }: { role: Role; reduced: boolean; index: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [6, -6]), {
    stiffness: 200,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-6, 6]), {
    stiffness: 200,
    damping: 30,
  });

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="home-role-card relative"
      style={reduced ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <Link
        href={role.href}
        className="group block h-full rounded-2xl border border-[var(--home-border-soft,rgba(255,255,255,0.08))] bg-[var(--home-bg-elev-1,#0F172A)] p-5"
      >
        <role.Icon className="h-7 w-7 text-[var(--home-accent-indigo,#6366F1)]" />
        <h3 className="mt-3 text-lg font-semibold text-[var(--home-text-primary,#F3F4F6)]">
          {role.name}
        </h3>
        <p className="mt-1 text-sm text-[var(--home-text-muted,#6B7280)]">{role.cap}</p>
        <span className="mt-3 inline-block text-xs font-semibold text-[var(--home-accent-steel,#0EA5E9)] opacity-0 transition group-hover:opacity-100">
          Sign in →
        </span>
      </Link>
    </motion.div>
  );
}

export function RoleMap() {
  const reduced = useReducedMotion();
  const coarse = useRef(false);
  if (typeof window !== "undefined") {
    coarse.current = window.matchMedia("(pointer: coarse)").matches;
  }

  return (
    <section
      aria-label="Roles"
      className="mx-auto w-full max-w-6xl px-6 py-16"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold md:text-4xl">Who is this portal for?</h2>
        <p className="mt-2 text-[var(--home-text-secondary,#9CA3AF)]">
          Every role on campus has a dedicated, permission-scoped dashboard.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((r, i) => (
          <TiltCard key={r.name} role={r} index={i} reduced={reduced || coarse.current} />
        ))}
      </div>
    </section>
  );
}
