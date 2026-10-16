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
            { href: "/caretaker/work-orders", label: "Work Orders", icon: "Wrench", badge: "OPEN" },
            { href: "/caretaker/facilities", label: "Facilities", icon: "Building2" },
            { href: "/caretaker/faults", label: "Faults", icon: "ShieldAlert", badge: "FAULTS" },
            { href: "/caretaker/history", label: "History", icon: "History" },
          ],
        },
      ];
      break;

    case "hostel_manager":
      // Hostel manager is migrated to the RoleConsole shell (kanban:tickets
      // of hostel tickets, scoped by hostel_scope). Single console group of
      // exactly 5 items so the IconRail stays lean.
      groups = [
        {
          groupLabel: "Hostel Manager Console",
          items: [
            { href: "/hostel-manager", label: "Tickets", icon: "Ticket", badge: "OPEN" },
            { href: "/hostel-manager/room-bed-allocation", label: "Allocation", icon: "Home" },
            { href: "/hostel-manager/resident-service-requests", label: "Residents", icon: "Users" },
            { href: "/hostel-manager/resource-management", label: "Resources", icon: "Wrench" },
            { href: "/hostel-manager/occupancy-reports", label: "Reports", icon: "FileSpreadsheet" },
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
      groups = [
        {
          groupLabel: "Principal Desk",
          items: [
            { href: "/principal", label: "Principal Dashboard", icon: "LayoutDashboard", badge: "OVERVIEW" },
            { href: "/principal/permissions", label: "Principal Approvals", icon: "CheckSquare", badge: "PENDING" },
            { href: "/supervisor?tab=alerts", label: "Security Radar", icon: "ShieldAlert", badge: "ALERTS" },
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
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];
      break;

    case "vice_principal":
      groups = [
        {
          groupLabel: "Vice Principal Desk",
          items: [
            { href: "/vice-principal", label: "VP Dashboard", icon: "LayoutDashboard", badge: "OVERVIEW" },
            { href: "/exam/permissions", label: "VP Approvals", icon: "CheckSquare", badge: "PENDING" },
          ],
        },
        {
          groupLabel: "General & Support",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];
      break;

    case "oie":
      groups = [
        {
          groupLabel: "Exam Branch",
          items: [
            { href: "/oie", label: "OIE Dashboard", icon: "LayoutDashboard", badge: "OVERVIEW" },
            { href: "/exam/permissions", label: "OIE Approvals", icon: "CheckSquare", badge: "PENDING" },
          ],
        },
        {
          groupLabel: "General & Support",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];
      break;

    case "exam_branch":
      groups = [
        {
          groupLabel: "Exam Branch",
          items: [
            { href: "/exam-branch", label: "Exam Branch Dashboard", icon: "LayoutDashboard", badge: "OVERVIEW" },
            { href: "/exam/permissions", label: "Exam Documents", icon: "FileText", badge: "PENDING" },
          ],
        },
        {
          groupLabel: "General & Support",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
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
      groups = [
        {
          groupLabel: "System Governance",
          items: [
            { href: "/sysadmin", label: "System Overview", icon: "LayoutDashboard", badge: "SYSADMIN" },
            { href: "/sysadmin/students", label: "Students Management", icon: "GraduationCap" },
            { href: "/sysadmin/staff", label: "Staff Management", icon: "Briefcase" },
            { href: "/sysadmin/roles", label: "Roles & Permissions", icon: "ShieldCheck" },
            { href: "/sysadmin/audit", label: "SysAdmin Audit Telemetry", icon: "ShieldAlert" },
            { href: "/sysadmin/departments", label: "Department & HOD Desk", icon: "Building2" },
            { href: "/sysadmin/promotions", label: "Role Promotions", icon: "UserCheck" },
            { href: "/sysadmin/sessions", label: "Active Sessions", icon: "Users" },
            { href: "/sysadmin/health", label: "System Health", icon: "Activity" },
            { href: "/sysadmin/infrastructure", label: "Infrastructure Monitoring", icon: "Server" },
          ],
        },
        {
          groupLabel: "Records & Alumni",
          items: [
            { href: "/sysadmin/alumni", label: "Alumni & Deprovision", icon: "GraduationCap", badge: "NEW" },
          ],
        },
        {
          groupLabel: "Integrations & Automation",
          items: [
            { href: "/sysadmin/sso", label: "SSO Configuration", icon: "Shield" },
            { href: "/sysadmin/integrations", label: "Integration Hub", icon: "Database" },
            { href: "/sysadmin/jobs", label: "Scheduled Background Jobs", icon: "Clock" },
            { href: "/sysadmin/scheduling", label: "Smart Scheduling", icon: "Sparkles" },
          ],
        },
        {
          groupLabel: "Security & Policy",
          items: [
            { href: "/sysadmin/security", label: "Zero-Trust Security", icon: "Lock" },
            { href: "/security", label: "Security Status", icon: "ShieldCheck" },
            { href: "/sysadmin/compliance", label: "Compliance & Retention", icon: "ShieldCheck" },
            { href: "/sysadmin/exit-reasons", label: "Exit Reasons & Outpass", icon: "DoorOpen" },
            { href: "/sysadmin/reasons", label: "Custom Reasons", icon: "MessageSquarePlus" },
            { href: "/sysadmin/devices", label: "Device Verification", icon: "Cpu" },
            { href: "/sysadmin/alerts/rules", label: "Alert Rules", icon: "Bell" },
            { href: "/sysadmin/navigation", label: "Navigation Editor", icon: "Layout" },
            { href: "/help", label: "Help & Docs", icon: "BookOpen" },
          ],
        },
        {
          groupLabel: "General & Information",
          items: [
            { href: "/sysadmin/profile", label: "SysAdmin Profile", icon: "UserCog" },
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];
      break;

    case "admin":
      groups = [
        {
          groupLabel: "Executive Command",
          items: [
            { href: "/admin", label: "Campus Dashboard", icon: "LayoutDashboard", badge: "LIVE" },
            { href: "/admin/overview", label: "Overview", icon: "Info" },
            { href: "/supervisor?tab=alerts", label: "Security Alerts", icon: "ShieldAlert", badge: "SECURE" },
          ],
        },
        {
          groupLabel: "Hostel & Mess",
          items: [
            { href: "/admin/mess", label: "Mess Configuration", icon: "UtensilsCrossed", badge: "MESS" },
          ],
        },
        {
          groupLabel: "Institutional Rosters",
          items: [
            { href: "/admin/students", label: "Student Master Roster", icon: "GraduationCap" },
            { href: "/admin/faculty", label: "Faculty Attendance", icon: "UserCheck" },
            { href: "/admin/staff", label: "Staff Oversight", icon: "Briefcase" },
            { href: "/admin/workers", label: "Worker Shift Tracker", icon: "HardHat" },
          ],
        },
        {
          groupLabel: "Analytics & Intelligence",
          items: [
            { href: "/admin/reports", label: "Gate Reports", icon: "FileSpreadsheet" },
            { href: "/admin/analytics", label: "Occupancy & Audit", icon: "Activity" },
            { href: "/admin/analytics/advanced", label: "Advanced Analytics & Reports", icon: "BarChart3" },
            { href: "/admin/analytics/predictive", label: "AI Predictive Analytics", icon: "Brain", badge: "AI" },
            { href: "/admin/occupancy", label: "Density Heatmap & Digital Twin", icon: "MapPin", badge: "2D LIVE" },
            { href: "/admin/analytics/users", label: "User Behavioral Analytics", icon: "Users" },
            { href: "/admin/sustainability", label: "Green IT & Sustainability", icon: "Leaf" },
          ],
        },
        {
          groupLabel: "Mess Management",
          items: [
            { href: "/admin/mess", label: "Mess Food Preferences", icon: "UtensilsCrossed", badge: "NEW" },
          ],
        },
        {
          groupLabel: "Administration & Settings",
          items: [
            { href: "/admin/users", label: "User Accounts & Roles", icon: "UserCog" },
            { href: "/admin/roles", label: "Roles & Hierarchy", icon: "ShieldCheck", badge: "LIVE" },
            { href: "/admin/announcements", label: "Broadcast Announcements", icon: "Megaphone" },
            { href: "/admin/support", label: "Support Desk Triage", icon: "LifeBuoy" },
            { href: "/admin/gates", label: "Gate Hardware Desk", icon: "QrCode" },
            { href: "/admin/gates/schedule", label: "Gate Access Rules", icon: "Clock" },
            { href: "/admin/health", label: "System Health & Ops", icon: "Activity" },
            { href: "/security", label: "Security Status", icon: "ShieldCheck" },
            { href: "/admin/settings", label: "System Settings", icon: "Settings" },
          ],
        },
        {
          groupLabel: "General & Information",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
        {
          groupLabel: "Campus Life",
          items: [
            { href: "/campus", label: "My Campus", icon: "Sparkles" },
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
      groups = [
        {
          groupLabel: "Supervisor Desk",
          items: [
            { href: "/supervisor", label: "Supervisor Dashboard", icon: "LayoutDashboard", badge: "OVERVIEW" },
            { href: "/supervisor?tab=approvals", label: "Outpass Approvals", icon: "CheckSquare", badge: "PENDING" },
            { href: "/supervisor?tab=curfew", label: "Curfew & Wards Roster", icon: "Clock" },
            { href: "/gate/active", label: "Gate Terminal Desk", icon: "QrCode" },
          ],
        },
        {
          groupLabel: "Campus Radar & Directory",
          items: [
            { href: "/supervisor?tab=alerts", label: "Security Radar", icon: "ShieldAlert", badge: "ALERTS" },
            { href: "/supervisor?tab=curfew", label: "Students Roster", icon: "GraduationCap" },
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
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];
      break;

    case "mess_incharge":
      groups = [
        {
          groupLabel: "Mess Operations",
          items: [
            { href: "/mess", label: "Mess Dashboard", icon: "LayoutDashboard", badge: "LIVE" },
            { href: "/mess/scan", label: "Token Scanner", icon: "QrCode", badge: "SCAN" },
          ],
        },
        {
          groupLabel: "General & Support",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
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
      groups = [
        {
          groupLabel: "Worker Portal",
          items: [
            { href: "/worker", label: "Worker Gate Pass", icon: "HardHat", badge: "SHIFT" },
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
    roleCode === "hostel_manager"
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
