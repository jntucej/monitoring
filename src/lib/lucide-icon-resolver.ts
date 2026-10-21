import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Clock,
  CreditCard,
  Database,
  DoorOpen,
  FileSpreadsheet,
  GraduationCap,
  HardDrive,
  HardHat,
  HelpCircle,
  History,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Link,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  Package,
  QrCode,
  Rocket,
  Salad,
  ScanLine,
  ScrollText,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Ticket,
  User,
  UserCheck,
  UserCog,
  Users,
  Utensils,
  UtensilsCrossed,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Sidebar icon resolver.
 *
 * The previous implementation did `import * as Icons from "lucide-react"` and
 * then `iconMap = Icons`, which forced the entire ~4,000-icon lucide registry
 * into the shared shell chunk (every route, because Sidebar lives under
 * SafeAreaAppShell → ClientProviders). This module imports only the icons that
 * are actually reachable from the nav config (`icon: "X"` string literals in
 * useNavigation.ts, operator-recommend.ts, and the admin/sysadmin overview
 * pages). Unknown names fall back to HelpCircle, which matches the previous
 * `|| Icons.HelpCircle` behaviour exactly.
 */
const iconMap: Record<string, LucideIcon> = {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Clock,
  CreditCard,
  Database,
  DoorOpen,
  FileSpreadsheet,
  GraduationCap,
  HardDrive,
  HardHat,
  HelpCircle,
  History,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Link,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  Package,
  QrCode,
  Rocket,
  Salad,
  ScanLine,
  ScrollText,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Ticket,
  User,
  UserCheck,
  UserCog,
  Users,
  Utensils,
  UtensilsCrossed,
  Wrench,
  Zap,
};

/**
 * Resolve a lucide icon by its config name. Unknown names (including the
 * lowercase config keys like "check", "alert", "in"/"out" that never matched
 * a real export) return the HelpCircle fallback — same as the old behaviour.
 */
export function getNavIcon(name: string | undefined | null): LucideIcon {
  if (!name) return HelpCircle;
  return iconMap[name] ?? HelpCircle;
}
