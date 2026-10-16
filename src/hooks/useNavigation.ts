/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

export interface NavItem {
  href: string;
  label: string;
  icon?: string;
  badge?: string;
  color?: string;
}

export interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

export function getDefaultNavigation(roleCode: string = "admin", isHod?: boolean, dept?: string): NavGroup[] {
  const accountGroup: NavGroup = {
    groupLabel: "Account",
    items: [
      { href: "/profile", label: "My Profile", icon: "User" },
      { href: "/settings/notifications", label: "Notifications", icon: "Bell" },
      { href: "/settings", label: "Settings", icon: "Settings" },
      { href: "/help", label: "Help", icon: "BookOpen" },
    ],
  };

  let groups: NavGroup[] = [];

  if (isHod || roleCode === "hod") {
    // HOD is migrated to the RoleConsole shell (Ops Console / Kanban). The nav
    // is intentionally a single "HOD Console" group of <=6 items so the IconRail
    // stays lean. No "Campus Life" / "General & Support" groups for HOD.
    groups = [
      {
        groupLabel: "HOD Console",
        items: [
          { href: "/hod", label: "Approvals", icon: "CheckSquare", badge: "PENDING" },
          { href: "/hod/department-attendance", label: "Department", icon: "UserCheck" },
          { href: "/hod/faculty-overview", label: "Faculty", icon: "Building2" },
          { href: "/hod/department-reports", label: "Reports", icon: "FileSpreadsheet" },
          { href: "/hod/escalation-centre", label: "Escalations", icon: "ShieldAlert" },
          { href: "/hod/student-directory", label: "Directory", icon: "GraduationCap" },
        ],
      },
    ];
  }

  switch (roleCode) {
    case "caretaker":
      groups = [
        {
          groupLabel: "Caretaker Console",
          items: [
            { href: "/caretaker", label: "Overview", icon: "LayoutDashboard", badge: "OVERVIEW" },
            { href: "/caretaker/maintenance", label: "Maintenance", icon: "Wrench", badge: "OPEN" },
            { href: "/caretaker/workers", label: "Workers", icon: "Users" },
          ],
        },
      ];
      break;

    case "hostel_manager":
      // Hostel manager is migrated to the RoleConsole shell (kanban:tickets
      // of hostel tickets, scoped by hostel_scope). Single console group of
      // exactly 5 items so the IconRail stays lean.
      // maintenance-requests, occupancy-reports, operational-reports,
      // resident-service-requests, room-bed-allocation deleted (redundant
      // stubs — data is served by /api/hostel-manager/summary +
      // /api/occupancy/presence-matrix + /api/campus-extra/analytics,
      // already rendered by the RoleConsole panels and remaining pages).
      groups = [
        {
          groupLabel: "Hostel Manager Console",
          items: [
            { href: "/hostel-manager", label: "Tickets", icon: "Ticket", badge: "OPEN" },
            { href: "/hostel-manager/housekeeping-tasks", label: "Housekeeping", icon: "Wrench" },
            { href: "/hostel-manager/resource-management", label: "Resources", icon: "Package" },
            { href: "/hostel-manager/tickets", label: "My Tickets", icon: "ClipboardList" },
          ],
        },
      ];
      break;

    case "deputy_warden":
      // Deputy warden is migrated to the RoleConsole shell (kanban:pending
      // hostel permissions at the deputy_warden stage). The nav is a single
      // console group of exactly 5 items so the IconRail stays lean.
      groups = [
        {
          groupLabel: "Deputy Warden Console",
          items: [
            { href: "/deputy-warden", label: "Approvals", icon: "CheckSquare", badge: "PENDING" },
            { href: "/deputy-warden/gate-movement", label: "Gate Movement", icon: "DoorOpen" },
            { href: "/deputy-warden/resident-attendance", label: "Attendance", icon: "UserCheck" },
            { href: "/deputy-warden/shift-handover", label: "Shifts", icon: "CalendarClock" },
            { href: "/deputy-warden/decision-history", label: "History", icon: "History" },
          ],
        },
      ];
      break;

    case "principal":
      // Principal is migrated to the RoleConsole shell (feed:dashboard via
      // /api/principal/dashboard). Principal is a top authority role — scope
      // is all workflows, no hostel/branch filter. Single console group of
      // exactly 5 items so the IconRail stays lean. No "Campus Life" /
      // "General & Support" groups. All 5 commands are pure navigation to the
      // real principal sub-pages under /principal/.
      groups = [
        {
          groupLabel: "Principal Console",
          items: [
            { href: "/principal", label: "Dashboard", icon: "LayoutDashboard", badge: "OVERVIEW" },
            { href: "/principal/delegation-manager", label: "Delegations", icon: "UserCog" },
            { href: "/principal/audit", label: "Audit", icon: "ScrollText" },
            { href: "/principal/reports", label: "Reports", icon: "FileSpreadsheet" },
            { href: "/principal/approvals", label: "Approvals", icon: "CheckSquare", badge: "PENDING" },
          ],
        },
      ];
      break;

    case "vice_principal":
      // Vice Principal is migrated to the RoleConsole shell (feed:
      // /api/principal/dashboard, itemKey "item", VP scope = delegated
      // oversight, no hostel/branch filter). Single console group of exactly
      // 5 items so the IconRail stays lean. No "General & Support" group.
      // All 5 commands are pure navigation to the real VP sub-pages under
      // /vice-principal/.
      groups = [
        {
          groupLabel: "VP Console",
          items: [
            { href: "/vice-principal/pending-approvals", label: "Approvals", icon: "CheckSquare", badge: "PENDING" },
            { href: "/vice-principal/delegated-responsibilities", label: "Delegations", icon: "KeyRound" },
            { href: "/vice-principal/decision-history", label: "Audit", icon: "History" },
            { href: "/vice-principal/reports", label: "Reports", icon: "FileSpreadsheet" },
            { href: "/vice-principal/decision-history", label: "Records", icon: "ClipboardList" },
          ],
        },
      ];
      break;

    case "oie":
      // OIE is migrated to the RoleConsole shell (kanban:exam queue via
      // /api/oie/queue, exam-scoped). Single console group of exactly 5 items
      // so the IconRail stays lean. No "Exam Branch" / "General & Support"
      // groups.
      groups = [
        {
          groupLabel: "OIE Console",
          items: [
            { href: "/oie", label: "Exam Queue", icon: "CheckSquare", badge: "PENDING" },
            { href: "/oie/candidate-attendance", label: "Candidates", icon: "Users" },
            { href: "/oie/examination-day-access", label: "Access", icon: "DoorOpen" },
            { href: "/oie/access-exceptions", label: "Exceptions", icon: "ShieldAlert" },
            { href: "/oie/records", label: "Records", icon: "FileSpreadsheet" },
          ],
        },
      ];
      break;

    case "exam_superintendent":
      // Exam superintendent is migrated to the RoleConsole shell (kanban via
      // /api/exam/access, PENDING/ACTIVE/CLOSED columns). Single console group
      // of exactly 5 items so the IconRail stays lean. No Account group.
      groups = [
        {
          groupLabel: "Exam Superintendent Console",
          items: [
            { href: "/exam/superintendent/access", label: "Access", icon: "DoorOpen", badge: "PENDING" },
            { href: "/exam/superintendent/schedule", label: "Schedule", icon: "CalendarClock" },
            { href: "/exam/superintendent/incidents", label: "Incidents", icon: "ShieldAlert" },
            { href: "/exam/superintendent/reports", label: "Reports", icon: "FileSpreadsheet" },
            { href: "/exam/superintendent/access", label: "Candidates", icon: "Users" },
          ],
        },
      ];
      break;

    case "exam_branch":
      // Exam branch is migrated to the RoleConsole shell (kanban: exam
      // permissions self-scoped to the caller's own branch via
      // /api/permissions?workflow_type=exam&branch=:self). Single console
      // group of exactly 5 items so the IconRail stays lean. No Account.
      groups = [
        {
          groupLabel: "Exam Branch Console",
          items: [
            { href: "/exam-branch/pass-queue", label: "Pass Queue", icon: "ClipboardList", badge: "PENDING" },
            { href: "/exam-branch/oie-handoff", label: "OIE Handoff", icon: "ArrowLeftRight" },
            { href: "/exam-branch/discrepancies", label: "Discrepancies", icon: "ShieldAlert" },
            { href: "/exam-branch/records", label: "Records", icon: "FileSpreadsheet" },
            { href: "/exam-branch/reports", label: "Reports", icon: "BarChart3" },
          ],
        },
      ];
      break;

    case "hostel_manager":
    case "caretaker":
      // Already handled above; these were listed in original code too
      break;

    case "deputy_warden":
      // Already handled above
      break;

    case "principal":
      // Already handled above
      break;

    case "vice_principal":
      // Already handled above
      break;

    case "oie":
      // Already handled above
      break;

    case "exam_branch":
      // Already handled above
      break;

    case "sysadmin":
      // SysAdmin is migrated to the RoleConsole shell (feed:application-health
      // via /api/sysadmin/application-health). Single console group of exactly
      // 5 items so the IconRail stays lean. No "System Governance" / "Security
      // & Policy" / "General & Information" groups. All 5 commands are pure
      // navigation to the real sysadmin sub-pages under /sysadmin/.
      groups = [
        {
          groupLabel: "SysAdmin Console",
          items: [
            { href: "/sysadmin/application-health", label: "Health", icon: "Activity", badge: "LIVE" },
            { href: "/sysadmin/docker-services", label: "Services", icon: "Server" },
            { href: "/sysadmin/deployments", label: "Deployments", icon: "Rocket" },
            { href: "/sysadmin/backup", label: "Backup", icon: "HardDrive" },
            { href: "/sysadmin/audit", label: "Audit", icon: "ShieldAlert" },
          ],
        },
      ];
      break;

    case "admin":
      // Admin is migrated to the RoleConsole shell (feed:admin alerts via
      // /api/admin/alerts). Single console group of exactly 5 items so the
      // IconRail stays lean. No "Executive Command" / "Hostel & Mess" /
      // "Analytics & Intelligence" / "Administration & Settings" groups. All
      // 5 commands are pure navigation to the real admin sub-pages under
      // /admin/ (backup maps to /admin/health, the closest existing
      // admin sub-page, since a dedicated /admin/backup page does not exist).
      groups = [
        {
          groupLabel: "Admin Console",
          items: [
            { href: "/admin/alerts", label: "Alerts", icon: "Bell", badge: "ACTIVE" },
            { href: "/admin/announcements", label: "Announcements", icon: "Megaphone" },
            { href: "/admin/audit-logs", label: "Audit", icon: "ScrollText" },
            { href: "/admin/health", label: "Backup", icon: "Activity" },
            { href: "/admin/reports", label: "Reports", icon: "FileSpreadsheet" },
          ],
        },
      ];
      break;

    case "operator":
      // Lean gate-desk nav: exactly 4 items (Scan, Log, Flags, More).
      // Scan → operator root (kiosk scanner). Log → transactions log.
      // Flags → exceptions/flagged scans. More → secondary commands.
      // No Account, no Reports, no Stats rows.
      groups = [
        {
          groupLabel: "Gate Operations Desk",
          items: [
            { href: "/operator", label: "Scan", icon: "QrCode", badge: "ACTIVE" },
            { href: "/operator/transactions", label: "Log", icon: "Clock" },
            { href: "/operator/exceptions", label: "Flags", icon: "ShieldAlert" },
            { href: "/operator/manual-entry", label: "More", icon: "MoreHorizontal" },
          ],
        },
      ];
      break;

    case "supervisor":
      // Supervisor is migrated to the RoleConsole shell (feed:escalations
      // via /api/supervisor/escalations, scoped to the caller's supervised_gates).
      // Single console group of exactly 5 items so the IconRail stays lean.
      // No "Campus Radar" / "General & Support" groups. No Account group.
      groups = [
        {
          groupLabel: "Supervisor Console",
          items: [
            { href: "/supervisor", label: "Live", icon: "Activity", badge: "PENDING" },
            { href: "/supervisor/escalation-centre", label: "Escalations", icon: "ShieldAlert" },
            { href: "/supervisor/gates", label: "Gates", icon: "DoorOpen" },
            { href: "/supervisor/shifts", label: "Shifts", icon: "CalendarClock" },
            { href: "/supervisor/reports", label: "Reports", icon: "FileSpreadsheet" },
          ],
        },
      ];
      break;

    case "mess_incharge":
      // Mess In-charge is migrated to the RoleConsole shell (digest board via
      // /api/mess/analytics + MealServePanel). Single console group of exactly
      // 5 items so the IconRail stays lean. No "General & Support" group. The
      // five items route to the real mess sub-pages under /mess/.
      groups = [
        {
          groupLabel: "Mess Console",
          items: [
            { href: "/mess", label: "Today", icon: "Utensils", badge: "PENDING" },
            { href: "/mess/menu-management", label: "Menu", icon: "Salad" },
            { href: "/mess/daily-meal-counts", label: "Counts", icon: "BarChart3" },
            { href: "/mess/inventory-stock", label: "Inventory", icon: "Package" },
            { href: "/mess/mess-issues", label: "Issues", icon: "ShieldAlert" },
          ],
        },
      ];
      break;

    case "faculty":
      groups = [
        {
          groupLabel: "Faculty Portal",
          items: [
            { href: "/faculty/permissions", label: "Student Permissions", icon: "CheckSquare", badge: "PENDING" },
            { href: "/faculty/attendance", label: "Faculty Attendance Desk", icon: "UserCheck", badge: "MY DEPT" },
            { href: "/person", label: "Digital Gate Pass", icon: "QrCode" },
          ],
        },
        {
          groupLabel: "Campus Life",
          items: [
            { href: "/campus", label: "My Campus", icon: "Sparkles" },
          ],
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];
      break;

    case "staff":
      groups = [
        {
          groupLabel: "Staff Console",
          items: [
            { href: "/staff", label: "My Day", icon: "ClipboardList", badge: "MY DAY" },
            { href: "/staff/duties", label: "Duties", icon: "CalendarClock" },
            { href: "/staff/leaves", label: "Leaves", icon: "CalendarDays", badge: "PENDING" },
            { href: "/staff/history", label: "History", icon: "History" },
          ],
        },
      ];
      break;

    case "worker":
      // Worker is migrated to the RoleConsole shell (digest board via
      // /api/workers/my-work: tasks / completedLastWeek / todayShift, plus
      // MyWorkPanel). Single console group of exactly 5 items so the IconRail
      // stays lean. No Account / Campus Life / General groups. All 5 commands
      // are navigation to the worker root — today only the root sub-page
      // (/worker/page.tsx) exists on disk, so every item targets /worker.
      groups = [
        {
          groupLabel: "Worker Console",
          items: [
            { href: "/worker", label: "My Work", icon: "ClipboardList", badge: "TASKS" },
            { href: "/worker", label: "Shifts", icon: "CalendarClock" },
            { href: "/worker", label: "Work Orders", icon: "Wrench" },
            { href: "/worker", label: "History", icon: "History" },
            { href: "/worker", label: "Records", icon: "FileSpreadsheet" },
          ],
        },
      ];
      break;

    case "student":
      groups = [
        {
          groupLabel: "My Digital Desk",
          items: [
            { href: "/student", label: "Digital ID & Gate Pass", icon: "QrCode", badge: "ID PASS" },
            { href: "/student/history", label: "My Scan Logs", icon: "Clock" },
            { href: "/student/passes", label: "Outpass Requests", icon: "FileSpreadsheet" },
            { href: "/student/permissions", label: "Permission Requests", icon: "ClipboardList", badge: "NEW" },
            { href: "/mess/default", label: "Mess Default", icon: "UtensilsCrossed" },
          ],
        },
        {
          groupLabel: "Campus Life",
          items: [
            { href: "/campus", label: "My Campus", icon: "Sparkles" },
          ],
        },
        {
          groupLabel: "General & Support",
          items: [
            { href: "/support", label: "Help & Support", icon: "LifeBuoy" },
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];
      break;

    case "parent":
      // Parent is migrated to the RoleConsole shell (feed:child-activity
      // timeline via /api/parents/me). Single console group of exactly 5 items
      // so the IconRail stays lean. No "Account" group. All 5 commands are
      // navigation (parent is a read-only role).
      groups = [
        {
          groupLabel: "Parent Console",
          items: [
            { href: "/parent", label: "Timeline", icon: "History", badge: "PENDING" },
            { href: "/parent/settings", label: "Notifications", icon: "Bell" },
            { href: "/parent/passes", label: "Fees", icon: "CreditCard" },
            { href: "/parent/child", label: "Records", icon: "FileSpreadsheet" },
            { href: "/support", label: "Contact", icon: "MessageSquare" },
          ],
        },
      ];
      break;

    case "guardian":
      groups = [
        {
          groupLabel: "Guardian Portal",
          items: [
            { href: "/parent", label: "Child Movement Tracker", icon: "Users", badge: "LIVE" },
            { href: "/parent/child", label: "Gate Movement Logs", icon: "Clock" },
            { href: "/parent/passes", label: "Outpass Approvals", icon: "CheckSquare" },
          ],
        },
        {
          groupLabel: "Campus Life",
          items: [
            { href: "/campus", label: "My Campus", icon: "Sparkles" },
          ],
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];
      break;

    default:
      groups = [
        {
          groupLabel: "Campus Portal",
          items: [
            { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];
  }

  // Filter out any existing "General" group that overlaps with Account group (to avoid duplicates)
  const filteredGroups = groups.filter(g => g.groupLabel !== "General" && g.groupLabel !== "General & Information" && g.groupLabel !== "General & Support");

  // The operator role uses the console shell (RoleConsole + IconRail), so the
  // Account group is intentionally omitted to keep the nav set to 5 items.
  if (roleCode === "operator") {
    return filteredGroups;
  }

  // HOD is also on the RoleConsole shell, so it skips the Account group too —
  // mirroring the operator pattern above.
  if (roleCode === "hod" || isHod) {
    return filteredGroups;
  }

  // Staff + the faculty console roles (class_teacher / subject_faculty) run on
  // the RoleConsole shell with a compact icon rail — skip the Account group so
  // the nav stays to the role's console items only. Caretaker is on the same
  // shell (grid:facilities board), so it skips Account too.
  if (
    roleCode === "staff" ||
    roleCode === "class_teacher" ||
    roleCode === "subject_faculty" ||
    roleCode === "faculty" ||
    roleCode === "caretaker" ||
    roleCode === "deputy_warden" ||
    roleCode === "hostel_manager" ||
    roleCode === "oie" ||
    roleCode === "exam_superintendent" ||
    roleCode === "supervisor" ||
    roleCode === "parent" ||
    roleCode === "exam_branch" ||
    roleCode === "mess_incharge" ||
    roleCode === "sysadmin" ||
    roleCode === "principal" ||
    roleCode === "admin" ||
    roleCode === "vice_principal" ||
    roleCode === "worker"
  ) {
    return filteredGroups;
  }

  return [...filteredGroups, accountGroup];
}

export function useNavItems(roleCode?: string) {
  const [navigation, setNavigation] = useState<NavGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const authStore = useAuthStore();
  const isHod = authStore.user?.isHod;
  const dept = authStore.user?.departmentId || "Branch";

  useEffect(() => {
    if (!roleCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNavigation([]);
      setLoading(false);
      return;
    }

    const defaults = getDefaultNavigation(roleCode, isHod, dept);
    const cacheKey = `gate-monitor-nav-${roleCode}-${isHod ? 'hod' : 'regular'}`;
    const CACHE_TTL_MS = 5 * 60 * 1000;

    if (typeof window !== "undefined") {
      try {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.data)) {
            setNavigation(parsed.data);
            setLoading(false);
            return;
          }
        }
      } catch {}
    }

    const fetchNav = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/config/navigation?role=${roleCode}`, { cache: "no-store" });
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setNavigation(json.data);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: json.data }));
          } catch {}
        } else {
          setNavigation(defaults);
        }
      } catch (err) {
        console.error("Navigation fetch failed, using defaults:", err);
        setNavigation(defaults);
      } finally {
        setLoading(false);
      };
    };
    fetchNav();
  }, [roleCode, isHod, dept]);

  return { navigation, loading };
}

/** @deprecated Use useNavItems — this name collides with the view-navigation hook. */
export const useNavigation = useNavItems;
