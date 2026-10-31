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
    // HOD Console navigation — flat 6-item list per spec section 12.
    // Approvals points to pending; Faculty points to directory.
    groups = [
      {
        groupLabel: "HOD Console",
        items: [
          { href: "/hod", label: "Today", icon: "LayoutDashboard" },
          { href: "/hod/approvals/pending", label: "Approvals", icon: "CheckSquare" },
          { href: "/hod/faculty/directory", label: "Faculty", icon: "Users" },
          { href: "/hod/students", label: "Students", icon: "GraduationCap" },
          { href: "/hod/classes", label: "Classes", icon: "BookOpen" },
          { href: "/hod/reports", label: "Reports", icon: "FileBarChart" },
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
            { href: "/caretaker", label: "Today" },
            { href: "/caretaker/complaints", label: "Complaints" },
            { href: "/caretaker/maintenance", label: "Maintenance" },
            { href: "/caretaker/workers", label: "Workers" },
            { href: "/caretaker/buildings", label: "Buildings" },
          ],
        },
      ];
      break;

    case "hostel_manager":
      groups = [
        {
          groupLabel: "Hostel Manager Console",
          items: [
            { href: "/hostel-manager", label: "Today" },
            { href: "/hostel-manager/tickets", label: "Resident tickets" },
            { href: "/hostel-manager/complaints", label: "Complaints" },
            { href: "/hostel-manager/housekeeping-tasks", label: "Housekeeping" },
            { href: "/hostel-manager/resource-management", label: "Resources" },
            { href: "/hostel-manager/maintenance", label: "Maintenance" },
            { href: "/hostel-manager/residents", label: "All residents" },
            { href: "/hostel-manager/rooms", label: "Rooms" },
            { href: "/hostel-manager/allocation", label: "Allocation" },
          ],
        },
      ];
      break;

    case "deputy_warden":
      groups = [
        {
          groupLabel: "Deputy Warden Console",
          items: [
            { href: "/deputy-warden", label: "Today" },
            { href: "/deputy-warden/outpass-queue", label: "Outpass queue" },
            { href: "/deputy-warden/leave-requests", label: "Leave requests" },
            { href: "/deputy-warden/delegated-approvals", label: "Delegated" },
            { href: "/deputy-warden/daily-overview", label: "Overview" },
            { href: "/deputy-warden/gate-movement", label: "Gate movement" },
            { href: "/deputy-warden/curfew-oversight", label: "Curfew" },
            { href: "/deputy-warden/incident-reporting", label: "Incidents" },
            { href: "/deputy-warden/shift-handover", label: "Handover" },
            { href: "/deputy-warden/decision-history", label: "Decision history" },
            { href: "/deputy-warden/complaints", label: "Complaints" },
          ],
        },
      ];
      break;

    case "principal":
      groups = [
        {
          groupLabel: "Principal",
          items: [
            { href: "/principal", label: "Today", icon: "LayoutDashboard" },
            { href: "/principal/approvals/pending", label: "Approvals", icon: "CheckSquare" },
            { href: "/principal/people/departments", label: "People", icon: "Users" },
            { href: "/principal/operations/gates", label: "Operations", icon: "DoorOpen" },
            { href: "/principal/examinations", label: "Exams", icon: "FileText" },
            { href: "/principal/governance/audit", label: "Governance", icon: "Scale" },
          ],
        },
      ];
      break;

    case "vice_principal":
      groups = [
        {
          groupLabel: "Vice Principal",
          items: [
            { href: "/vice-principal", label: "Today", icon: "LayoutDashboard" },
            { href: "/vice-principal/approvals/pending", label: "Approvals", icon: "CheckSquare" },
            { href: "/vice-principal/academics/departments", label: "Academics", icon: "GraduationCap" },
            { href: "/vice-principal/examinations", label: "Examinations", icon: "FileText" },
            { href: "/vice-principal/history/30-days", label: "History", icon: "History" },
            { href: "/vice-principal/profile", label: "Profile", icon: "UserCog" },
          ],
        },
      ];
      break;

    case "oie":
      groups = [
        {
          groupLabel: "OIE Console",
          items: [
            { href: "/oie", label: "Today" },
            { href: "/oie/queue/pending", label: "Pending" },
            { href: "/oie/queue/escalated", label: "Escalated" },
            { href: "/oie/queue/history", label: "History" },
            { href: "/oie/examination-day-access", label: "Day access" },
            { href: "/oie/access-exceptions", label: "Exceptions" },
            { href: "/oie/candidate-attendance", label: "Candidate attendance" },
            { href: "/oie/exam-branch-coordination", label: "Branch coordination" },
            { href: "/oie/records", label: "Records" },
            { href: "/oie/decision-history", label: "Decision history" },
            { href: "/oie/examination-reports", label: "Reports" },
          ],
        },
      ];
      break;

    case "exam_superintendent":
      groups = [
        {
          groupLabel: "Exam Superintendent Console",
          items: [
            { href: "/exam/superintendent", label: "Today" },
            { href: "/exam/superintendent/access", label: "Access" },
            { href: "/exam/superintendent/schedule", label: "Schedule" },
            { href: "/exam/superintendent/incidents", label: "Incidents" },
            { href: "/exam/superintendent/reports", label: "Reports" },
          ],
        },
      ];
      break;

    case "exam_branch":
      groups = [
        {
          groupLabel: "Exam Branch Console",
          items: [
            { href: "/exam-branch", label: "Today" },
            { href: "/exam-branch/pass-queue", label: "Pass queue" },
            { href: "/exam-branch/oie-approval-requests", label: "OIE approvals" },
            { href: "/exam-branch/oie-handoff", label: "OIE handoff" },
            { href: "/exam-branch/records", label: "Records" },
            { href: "/exam-branch/verification", label: "Verification" },
            { href: "/exam-branch/discrepancies", label: "Discrepancies" },
            { href: "/exam-branch/calendar", label: "Calendar" },
            { href: "/exam-branch/docs", label: "Docs" },
            { href: "/exam-branch/reports", label: "Reports" },
          ],
        },
      ];
      break;



    case "principal":
      // Already handled above
      break;

    case "vice_principal":
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
      groups = [
        {
          groupLabel: "Gate Operations Desk",
          items: [
            { href: "/operator", label: "Desk" },
            { href: "/operator/transactions", label: "Transactions" },
            { href: "/operator/exceptions", label: "Exceptions" },
            { href: "/operator/manual-entry", label: "Manual entry" },
            { href: "/operator/pass-verification", label: "Pass verification" },
            { href: "/operator/claim", label: "Claim gate" },
            { href: "/operator/kiosk-pin", label: "Kiosk PIN" },
          ],
        },
      ];
      break;

    case "supervisor":
      return [
        {
          groupLabel: "Supervisor",
          items: [
            { href: "/supervisor", label: "Today", icon: "LayoutDashboard" },
            { href: "/supervisor/shift/live", label: "Shift", icon: "Clock" },
            { href: "/supervisor/team/workers", label: "Team", icon: "Users" },
            { href: "/supervisor/gates/live", label: "Gates", icon: "DoorOpen" },
            { href: "/supervisor/response/escalations", label: "Response", icon: "Siren" },
            { href: "/supervisor/reports", label: "Reports", icon: "BarChart3" },
          ],
        },
      ];

    case "mess_incharge":
      groups = [
        {
          groupLabel: "Mess Console",
          items: [
            { href: "/mess", label: "Today" },
            { href: "/mess/menu-management", label: "Menu" },
            { href: "/mess/daily-meal-counts", label: "Daily counts" },
            { href: "/mess/meal-attendance", label: "Attendance" },
            { href: "/mess/consumption-reports", label: "Consumption" },
            { href: "/mess/inventory-stock", label: "Stock" },
            { href: "/mess/special-events", label: "Special events" },
            { href: "/mess/reviews", label: "Reviews" },
            { href: "/mess/mess-issues", label: "Issues" },
            { href: "/mess/operational-requests", label: "Requests" },
            { href: "/mess/verify-token", label: "Verify token" },
            { href: "/mess/scan", label: "Scan" },
          ],
        },
      ];
      break;

    case "faculty":
      groups = [
        {
          groupLabel: "Faculty Portal",
          items: [
            { href: "/faculty", label: "Today" },
            { href: "/faculty/my-classes", label: "My classes" },
            { href: "/faculty/attendance", label: "Attendance" },
            { href: "/faculty/student-directory", label: "Students" },
            { href: "/faculty/permissions", label: "Permissions" },
            { href: "/faculty/correction-requests", label: "Corrections" },
            { href: "/faculty/request-history", label: "Request history" },
            { href: "/faculty/reports", label: "Reports" },
            { href: "/faculty/notifications", label: "Notifications" },
          ],
        },
      ];
      break;

    case "staff":
      groups = [
        {
          groupLabel: "Staff Console",
          items: [
            { href: "/staff", label: "Today" },
            { href: "/staff/my-day", label: "My day" },
            { href: "/staff/assigned-tasks", label: "Assigned tasks" },
            { href: "/staff/duties", label: "Duties" },
            { href: "/staff/requests", label: "Requests" },
            { href: "/staff/leaves", label: "Leaves" },
            { href: "/staff/request-status", label: "Request status" },
            { href: "/staff/history", label: "History" },
            { href: "/staff/notifications", label: "Notifications" },
          ],
        },
      ];
      break;

    case "worker":
      groups = [
        {
          groupLabel: "Worker Console",
          items: [
            { href: "/worker", label: "Today" },
            { href: "/worker/shifts", label: "Shifts" },
            { href: "/worker/work-orders", label: "Work orders" },
            { href: "/worker/history", label: "History" },
          ],
        },
      ];
      break;

    case "student":
      groups = [
        {
          groupLabel: "Student Console",
          items: [
            { href: "/student", label: "Home" },
            { href: "/student/permissions", label: "My tickets" },
            { href: "/student/permissions/new", label: "New request" },
            { href: "/student/request-tracking", label: "Tracking" },
            { href: "/student/id", label: "My ID" },
            { href: "/student/mess/token", label: "Meal token" },
            { href: "/student/mess/reviews", label: "Reviews" },
            { href: "/student/mess/special", label: "Special" },
            { href: "/student/mess-bill", label: "Bill" },
            { href: "/student/complaints", label: "Complaints" },
            { href: "/student/anti-ragging", label: "Anti-ragging" },
            { href: "/student/notifications", label: "Notifications" },
            { href: "/student/profile", label: "Profile" },
          ],
        },
      ];
      break;

    case "parent":
      groups = [
        {
          groupLabel: "Parent Console",
          items: [
            { href: "/parent", label: "Today" },
            { href: "/parent/child", label: "Status" },
            { href: "/parent/child-attendance", label: "Attendance" },
            { href: "/parent/child-requests", label: "Requests" },
            { href: "/parent/child-movement", label: "Movement" },
            { href: "/parent/passes", label: "Passes" },
            { href: "/parent/pass-leave-submission", label: "Submit" },
            { href: "/parent/settings", label: "Settings" },
            { href: "/parent/contact-info", label: "Contact info" },
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

    case "class_teacher":
      groups = [
        {
          groupLabel: "Faculty Portal",
          items: [
            { href: "/faculty", label: "Today" },
            { href: "/faculty/my-classes", label: "My classes" },
            { href: "/faculty/attendance", label: "Attendance" },
            { href: "/faculty/student-directory", label: "Students" },
            { href: "/faculty/permissions", label: "Permissions" },
            { href: "/faculty/correction-requests", label: "Corrections" },
            { href: "/faculty/request-history", label: "Request history" },
            { href: "/faculty/reports", label: "Reports" },
            { href: "/faculty/notifications", label: "Notifications" },
          ],
        },
      ];
      break;

    case "subject_faculty":
      groups = [
        {
          groupLabel: "Subject Faculty Console",
          items: [
            { href: "/faculty/subject", label: "Today" },
            { href: "/faculty/subject/classes", label: "My classes" },
            { href: "/faculty/subject/attendance", label: "Attendance" },
          ],
        },
      ];
      break;

    case "visitor":
      groups = [
        {
          groupLabel: "Visitor Portal",
          items: [
            { href: "/visitor", label: "Home" },
            { href: "/visitor/registration", label: "Registration" },
            { href: "/visitor/host-info", label: "Host info" },
            { href: "/visitor/approval-status", label: "Approval status" },
            { href: "/visitor/visit-details", label: "Visit details" },
            { href: "/visitor/checkin-out", label: "Check in/out" },
            { href: "/visitor/history", label: "History" },
          ],
        },
      ];
      break;

    case "emo":
      groups = [
        {
          groupLabel: "EMO Console",
          items: [
            { href: "/emo", label: "Today" },
            { href: "/emo/complaints", label: "Complaints" },
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
