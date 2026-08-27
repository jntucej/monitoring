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
  if (isHod || roleCode === "hod") {
    return [
      {
        groupLabel: "Department Workspace",
        items: [
          { href: "/hod", label: "HOD Dashboard", icon: "LayoutDashboard", badge: dept || "HOD" },
          { href: "/admin/faculty", label: "Department Faculty", icon: "UserCheck" },
          { href: "/admin/students", label: "Branch Students", icon: "GraduationCap" },
        ],
      },
      {
        groupLabel: "Approvals & Reports",
        items: [
          { href: "/hod?tab=approvals", label: "Outpass Approvals", icon: "CheckSquare", badge: "PENDING" },
          { href: "/admin/reports", label: "Branch Reports", icon: "FileSpreadsheet" },
        ],
      },
      {
        groupLabel: "General & Support",
        items: [
          { href: "/person", label: "My Profile", icon: "User" },
          { href: "/about", label: "About Campus", icon: "HelpCircle" },
        ],
      },
    ];
  }

  switch (roleCode) {
    case "sysadmin":
    case "admin":
      return [
        {
          groupLabel: "Executive Command",
          items: [
            { href: "/admin", label: "Campus Dashboard", icon: "LayoutDashboard", badge: "LIVE" },
            { href: "/admin/alerts", label: "Security Alerts", icon: "ShieldAlert", badge: "SECURE" },
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
            { href: "/sysadmin/audit", label: "SysAdmin Audit Telemetry", icon: "ShieldAlert" },
          ],
        },
        {
          groupLabel: "Administration & Governance",
          items: [
            { href: "/admin/users", label: "User Accounts & Roles", icon: "UserCog" },
            { href: "/sysadmin/promotions", label: "Role Promotion Workflow", icon: "UserCheck" },
            { href: "/sysadmin/integrations", label: "Integration Hub", icon: "Database" },
            { href: "/sysadmin/jobs", label: "Scheduled Background Jobs", icon: "Clock" },
            { href: "/sysadmin/sessions", label: "Active User Sessions", icon: "Users" },
            { href: "/sysadmin/compliance", label: "Compliance & Retention", icon: "ShieldCheck" },
            { href: "/sysadmin/security", label: "Zero-Trust Security", icon: "Lock" },
            { href: "/help", label: "Help & Docs", icon: "BookOpen" },
            { href: "/admin/announcements", label: "Broadcast Announcements", icon: "Megaphone" },
            { href: "/admin/support", label: "Support Desk Triage", icon: "LifeBuoy" },
            { href: "/admin/gates", label: "Gate Hardware Desk", icon: "QrCode" },
            { href: "/admin/gates/schedule", label: "Gate Access Rules", icon: "Clock" },
            { href: "/admin/health", label: "System Health & Ops", icon: "Activity" },
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
      ];

    case "operator":
    case "supervisor":
      return [
        {
          groupLabel: "Gate Operations Desk",
          items: [
            { href: "/gate/active", label: "Scanner Desk", icon: "QrCode", badge: "ACTIVE" },
            { href: "/gate/history", label: "Gate Scan Logs", icon: "Clock" },
            { href: "/gate/manual", label: "Manual Entry Override", icon: "CheckSquare" },
          ],
        },
        {
          groupLabel: "Security & Radar",
          items: [
            { href: "/admin/alerts", label: "Security Radar", icon: "ShieldAlert", badge: "WRN" },
          ],
        },
        {
          groupLabel: "General",
          items: [
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];

    case "faculty":
      return [
        {
          groupLabel: "Faculty Portal",
          items: [
            { href: "/admin/faculty", label: "Faculty Attendance Desk", icon: "UserCheck", badge: "MY DEPT" },
            { href: "/person", label: "Digital Gate Pass", icon: "QrCode" },
          ],
        },
        {
          groupLabel: "General",
          items: [
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];

    case "staff":
      return [
        {
          groupLabel: "Staff Portal",
          items: [
            { href: "/admin/staff", label: "Staff Attendance Desk", icon: "Briefcase", badge: "STAFF" },
            { href: "/person", label: "Digital Gate Pass", icon: "QrCode" },
          ],
        },
        {
          groupLabel: "General",
          items: [
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];

    case "student":
      return [
        {
          groupLabel: "My Digital Desk",
          items: [
            { href: "/student", label: "Digital ID & Gate Pass", icon: "QrCode", badge: "ID PASS" },
            { href: "/student/history", label: "My Scan Logs", icon: "Clock" },
            { href: "/student/passes", label: "Outpass Requests", icon: "FileSpreadsheet" },
          ],
        },
        {
          groupLabel: "General & Support",
          items: [
            { href: "/support", label: "Help & Support", icon: "LifeBuoy" },
            { href: "/person", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];

    case "parent":
    case "guardian":
      return [
        {
          groupLabel: "Guardian Portal",
          items: [
            { href: "/parent", label: "Child Movement Tracker", icon: "Users", badge: "LIVE" },
            { href: "/parent/child", label: "Gate Movement Logs", icon: "Clock" },
            { href: "/parent/passes", label: "Outpass Approvals", icon: "CheckSquare" },
          ],
        },
        {
          groupLabel: "General",
          items: [
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];

    default:
      return [
        {
          groupLabel: "Campus Portal",
          items: [
            { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" },
          ],
        },
      ];
  }
}

export function useNavigation(roleCode?: string) {
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

    const fetchNav = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/config/navigation?role=${roleCode}`, { cache: "no-store" });
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setNavigation(json.data);
        } else {
          setNavigation(defaults);
        }
      } catch (err) {
        console.error("Navigation fetch failed, using defaults:", err);
        setNavigation(defaults);
      } finally {
        setLoading(false);
      }
    };
    fetchNav();
  }, [roleCode, isHod, dept]);

  return { navigation, loading };
}
