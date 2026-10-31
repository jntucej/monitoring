"use client";

/* ── PrincipalSidebar ── */

import { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Eye,
  MessageSquare,
  Share2,
  FileText,
  UserCircle,
  Inbox,
  Clock,
  Users,
  AlertTriangle,
  Settings,
  History,
  PieChart,
  ClipboardCheck,
  AlertCircle,
  Flame,
  Bell,
  Calendar,
  BookOpen,
  Thermometer,
  CheckCircle2,
  ShieldCheck,
  Crown,
} from "lucide-react";
import { PrincipalSidebarCategory } from "./PrincipalSidebarCategory";
import { PrincipalTopBar } from "./PrincipalTopBar";
import type { NotificationItem } from "./PrincipalNotifications";

interface PrincipalSidebarProps {
  open?: boolean;
  onClose?: () => void;
  notifications?: NotificationItem[];
  unreadCount?: number;
}

// Navigation categories: 6 functional + PROFILE
const NAV_CATEGORIES = [
  {
    title: "DECIDE",
    icon: <Inbox className="h-4 w-4" />,
    defaultOpen: true,
    items: [
      { href: "/principal/approvals?tab=mine", label: "Inbox", icon: Inbox },
      { href: "/principal/approvals?tab=overdue", label: "Overdue", icon: Clock },
      { href: "/principal/approvals?tab=delegated", label: "Delegated", icon: Share2 },
      { href: "/principal/approvals?tab=escalated", label: "Escalated", icon: AlertTriangle },
      { href: "/principal/permissions", label: "Manage Approved", icon: CheckCircle2 },
    ],
  },
  {
    title: "HOSTELS",
    icon: <Building2 className="h-4 w-4" />,
    defaultOpen: false,
    items: [
      { href: "/principal/gate-activity", label: "Overview", icon: LayoutDashboard },
      { href: "/principal/hostel-oversight", label: "Curfew", icon: ShieldCheck },
      { href: "/principal/complaints", label: "Complaints", icon: MessageSquare },
      { href: "/principal/gate-activity", label: "Activity", icon: Bell },
    ],
  },
  {
    title: "OVERSEE",
    icon: <Eye className="h-4 w-4" />,
    defaultOpen: false,
    items: [
      { href: "/principal/departments", label: "Departments", icon: Users },
      { href: "/principal/examination-oversight", label: "Exams", icon: BookOpen },
      { href: "/principal/campus-activity", label: "Campus Activity", icon: Calendar },
      { href: "/principal/sla-heatmap", label: "SLA Heatmap", icon: Thermometer },
    ],
  },
  {
    title: "RESPOND",
    icon: <AlertCircle className="h-4 w-4" />,
    defaultOpen: false,
    items: [
      { href: "/principal/complaints", label: "Complaints", icon: MessageSquare },
      { href: "/principal/incidents", label: "Incidents", icon: AlertTriangle },
      { href: "/principal/emergency-decisions", label: "Emergency", icon: Flame },
    ],
  },
  {
    title: "DELEGATE",
    icon: <Share2 className="h-4 w-4" />,
    defaultOpen: false,
    items: [
      { href: "/principal/governance/delegations", label: "Rules", icon: Settings },
      { href: "/principal/governance/delegations", label: "In Force", icon: CheckCircle2 },
      { href: "/principal/audit", label: "History", icon: History },
    ],
  },
  {
    title: "REVIEW",
    icon: <FileText className="h-4 w-4" />,
    defaultOpen: false,
    items: [
      { href: "/principal/audit", label: "Audit", icon: FileText },
      { href: "/principal/reports", label: "Reports", icon: PieChart },
    ],
  },
];

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon?: React.ComponentType<{ className?: string }> }) {
  const pathname = usePathname();
  const isActive = href === pathname || pathname?.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
        isActive
          ? "bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
          : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate">{label}</span>
    </Link>
  );
}

export const PrincipalSidebar = memo(function PrincipalSidebar({
  open = false,
  onClose,
  notifications = [],
  unreadCount = 0,
}: PrincipalSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform bg-[var(--bg-surface)] border-r border-[var(--border)] transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* TopBar inside sidebar on mobile */}
        <div className="md:hidden">
          <PrincipalTopBar
            role="principal"
            userName=""
            unreadCount={unreadCount}
            onMenuClick={onClose}
          />
        </div>

        {/* Desktop sidebar header */}
        <div className="hidden md:flex h-14 items-center gap-2 border-b border-[var(--border)] px-4">
          <Crown className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Principal</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {NAV_CATEGORIES.map((cat) => (
            <PrincipalSidebarCategory
              key={cat.title}
              title={cat.title}
              icon={cat.icon}
              defaultOpen={cat.defaultOpen}
            >
              {cat.items.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </PrincipalSidebarCategory>
          ))}

          {/* Profile section */}
          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <PrincipalSidebarCategory title="PROFILE" icon={<UserCircle className="h-4 w-4" />} defaultOpen={false}>
              <NavItem href="/principal/settings" label="Settings" icon={Settings} />
              <NavItem href="/principal/profile" label="Profile" icon={UserCircle} />
            </PrincipalSidebarCategory>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-[var(--border)] p-4">
          <p className="text-[10px] text-[var(--text-muted)]">
            Campus Management System v1.0
          </p>
        </div>
      </aside>
    </>
  );
});
