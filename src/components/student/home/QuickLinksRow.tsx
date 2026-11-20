"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Calendar,
  ClipboardList,
  Home,
  Utensils,
  BookOpen,
} from "lucide-react";
import { useEffectivePref } from "@/hooks/useEffectivePref";

const LINKS = [
  { id: "requests", href: "/student/permissions", label: "Requests", Icon: ClipboardList },
  { id: "passes", href: "/student/passes", label: "Passes", Icon: Home },
  { id: "attendance", href: "/student/attendance", label: "Attendance", Icon: Calendar },
  { id: "mess", href: "/student/mess", label: "Mess", Icon: Utensils },
  { id: "campus", href: "/student/campus", label: "Campus", Icon: BookOpen },
] as const;

type LinkId = (typeof LINKS)[number]["id"];

export function QuickLinksRow() {
  // Trait-aware quick actions: the 5-layer cascade determines which 4–6
  // links show and their order. A hosteller sees "Passes" first; a day
  // scholar sees "Requests" first. A year-1 sees "Attendance" prominent.
  const orderPref = useEffectivePref<LinkId[]>("quick_actions.selected");

  const links = useMemo(() => {
    const order = orderPref.value ?? [];
    const known = new Set(LINKS.map((l) => l.id));
    const valid = order.filter((id) => known.has(id));
    const missing = LINKS.filter((l) => !valid.includes(l.id)).map((l) => l.id);
    return [...valid, ...missing];
  }, [orderPref.value]);

  return (
    <div className="grid grid-cols-5 gap-2">
      {links.map((id) => {
        const link = LINKS.find((l) => l.id === id);
        if (!link) return null;
        const { Icon } = link;
        return (
          <Link
            key={id}
            href={link.href}
            className="surface-card flex flex-col items-center gap-1 bg-bg-surface py-3 text-xs text-text-secondary"
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default QuickLinksRow;
