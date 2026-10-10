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
      { href: "/help", label: "Help", icon: "BookOpen" }
    ]
  };

  let groups: NavGroup[] = [];

  if (isHod || roleCode === "hod") {
    groups = [
      {
        groupLabel: "Department Workspace",
        items: [
          { href: "/hod", label: "HOD Dashboard", icon: "LayoutDashboard", badge: `${dept} HOD` },
          { href: "/admin/faculty", label: "Department Faculty", icon: "UserCheck" },
          { href: "/admin/students", label: "Branch Students", icon: "GraduationCap" }
        ]
      },
      {
        groupLabel: "Approvals Reports",
        items: [
          { href: "/hod/permissions", label: "HOD Approvals", icon: "CheckSquare", badge: "PENDING" },
          { href: "/hod?tab=approvals", label: "Outpass Approvals", icon: "CheckSquare", badge: "PENDING" },
          { href: "/admin/reports", label: "Branch Reports", icon: "FileSpreadsheet" }
        ]
      },
      {
        groupLabel: "General Support",
        items: [
          { href: "/profile", label: "My Profile", icon: "User" },
          { href: "/about", label: "About Campus", icon: "HelpCircle" }
        ]
      }
    ];
  }

  switch (roleCode) {
    case "caretaker":
      groups = [
        {
          groupLabel: "Hostel Permissions",
          items: [
            { href: "/hostel/permissions", label: "Pending Approvals", icon: "ClipboardList", badge: "PENDING" },
            { href: "/permissions", label: "My Tickets", icon: "FileText" }
          ]
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "deputy_warden":
      groups = [
        {
          groupLabel: "Hostel Permissions",
          items: [
            { href: "/hostel/permissions", label: "Pending Approvals", icon: "ClipboardList", badge: "PENDING" },
            { href: "/permissions", label: "My Tickets", icon: "FileText" }
          ]
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "hostel_manager":
      groups = [
        {
          groupLabel: "Hostel Permissions",
          items: [
            { href: "/hostel/permissions", label: "Pending Approvals", icon: "ClipboardList", badge: "PENDING" },
            { href: "/permissions", label: "My Tickets", icon: "FileText" }
          ]
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "principal":
      groups = [
        {
          groupLabel: "Principal Desk",
          items: [
            { href: "/principal/permissions", label: "Warden / Principal Approvals", icon: "CheckSquare", badge: "PENDING" }
          ]
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "vice_principal":
      groups = [
        {
          groupLabel: "Vice Principal Desk",
          items: [
            { href: "/exam/permissions", label: "VP Approvals", icon: "CheckSquare", badge: "PENDING" }
          ]
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "oie":
    case "exam_branch":
      groups = [
        {
          groupLabel: "Exam Branch",
          items: [
            { href: "/exam/permissions", label: "Exam Documents", icon: "FileText", badge: "PENDING" }
          ]
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "sysadmin":
      groups = [
        {
          groupLabel: "System Governance",
          items: [
            { href: "/sysadmin", label: "System Overview", icon: "LayoutDashboard", badge: "SYSADMIN" },
            { href: "/sysadmin/students", label: "Students Management", icon: "GraduationCap" },
            { href: "/sysadmin/staff", label: "Staff Management", icon: "Briefcase" },
            { href: "/sysadmin/roles", label: "Roles Permissions", icon: "ShieldCheck" },
            { href: "/sysadmin/audit", label: "SysAdmin Audit Telemetry", icon: "ShieldAlert" },
            { href: "/sysadmin/departments", label: "Department HOD Desk", icon: "Building2" },
            { href: "/sysadmin/promotions", label: "Role Promotions", icon: "UserCheck" },
            { href: "/sysadmin/sessions", label: "Active Sessions", icon: "Users" },
            { href: "/sysadmin/health", label: "System Health", icon: "Activity" },
            { href: "/sysadmin/infrastructure", label: "Infrastructure Monitoring", icon: "Server" }
          ]
        },
        {
          groupLabel: "Integrations Automation",
          items: [
            { href: "/sysadmin/sso", label: "SSO Configuration", icon: "Shield" },
            { href: "/sysadmin/integrations", label: "Integration Hub", icon: "Database" },
            { href: "/sysadmin/jobs", label: "Scheduled Background Jobs", icon: "Clock" },
            { href: "/sysadmin/scheduling", label: "Smart Scheduling", icon: "Sparkles" }
          ]
        },
        {
          groupLabel: "Security Policy",
          items: [
            { href: "/sysadmin/security", label: "Zero-Trust Security", icon: "Lock" },
            { href: "/security", label: "Security Status", icon: "ShieldCheck" }
          ]
        },
        {
          groupLabel: "General Information",
          items: [
            { href: "/sysadmin/profile", label: "SysAdmin Profile", icon: "UserCog" },
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "admin":
      groups = [
        {
          groupLabel: "Executive Command",
          items: [
            { href: "/admin", label: "Campus Dashboard", icon: "LayoutDashboard", badge: "LIVE" },
            { href: "/admin/overview", label: "Overview", icon: "Info" },
            { href: "/admin/alerts", label: "Security Alerts", icon: "ShieldAlert", badge: "SECURE" }
          ]
        },
        {
          groupLabel: "Institutional Rosters",
          items: [
            { href: "/admin/students", label: "Student Master Roster", icon: "GraduationCap" },
            { href: "/admin/faculty", label: "Faculty Attendance", icon: "UserCheck" },
            { href: "/admin/staff", label: "Staff Oversight", icon: "Briefcase" },
            { href: "/admin/workers", label: "Worker Shift Tracker", icon: "HardHat" }
          ]
        },
        {
          groupLabel: "Analytics Intelligence",
          items: [
            { href: "/admin/reports", label: "Gate Reports", icon: "FileSpreadsheet" },
            { href: "/admin/analytics", label: "Occupancy Audit", icon: "Activity" },
            { href: "/admin/analytics/advanced", label: "Advanced Analytics Reports", icon: "BarChart3" },
            { href: "/admin/analytics/predictive", label: "AI Predictive Analytics", icon: "Brain", badge: "AI" },
            { href: "/admin/occupancy", label: "Density Heatmap Digital Twin", icon: "MapPin", badge: "2D LIVE" },
            { href: "/admin/security", label: "Security Status", icon: "ShieldCheck" },
            { href: "/admin/settings", label: "System Settings", icon: "Settings" }
          ]
        },
        {
          groupLabel: "General Information",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "operator":
      groups = [
        {
          groupLabel: "Gate Operations Desk",
          items: [
            { href: "/gate/active", label: "Scanner Desk", icon: "QrCode", badge: "ACTIVE" },
            { href: "/gate/history", label: "Gate Scan Logs", icon: "Clock" },
            { href: "/gate/manual", label: "Manual Entry Override", icon: "CheckSquare" }
          ]
        },
        {
          groupLabel: "Security Radar",
          items: [
            { href: "/admin/alerts", label: "Security Radar", icon: "ShieldAlert", badge: "WRN" }
          ]
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "supervisor":
    case "warden":
      groups = [
        {
          groupLabel: "Supervisor Warden Desk",
          items: [
            { href: "/supervisor", label: "Supervisor Dashboard", icon: "LayoutDashboard", badge: "OVERVIEW" },
            { href: "/supervisor?tab=approvals", label: "Outpass Approvals", icon: "CheckSquare", badge: "PENDING" },
            { href: "/supervisor?tab=curfew", label: "Curfew Wards Roster", icon: "Clock" },
            { href: "/gate/active", label: "Gate Terminal Desk", icon: "QrCode", badge: "ACTIVE" }
          ]
        },
        {
          groupLabel: "Security Radar",
          items: [
            { href: "/admin/alerts", label: "Security Radar", icon: "ShieldAlert", badge: "WRN" }
          ]
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "faculty":
      groups = [
        {
          groupLabel: "Faculty Portal",
          items: [
            { href: "/admin/faculty", label: "Faculty Attendance Desk", icon: "UserCheck", badge: "MY DEPT" },
            { href: "/person", label: "Digital Gate Pass", icon: "QrCode" }
          ]
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "staff":
      groups = [
        {
          groupLabel: "Staff Portal",
          items: [
            { href: "/admin/staff", label: "Staff Attendance Desk", icon: "Briefcase", badge: "STAFF" },
            { href: "/person", label: "Digital Gate Pass", icon: "QrCode" }
          ]
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "worker":
      groups = [
        {
          groupLabel: "Worker Portal",
          items: [
            { href: "/worker", label: "Worker Gate Pass", icon: "HardHat", badge: "SHIFT" }
          ]
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "student":
      groups = [
        {
          groupLabel: "My Digital Desk",
          items: [
            { href: "/student", label: "Digital Gate Pass", icon: "QrCode", badge: "ID PASS" },
            { href: "/student/history", label: "My Scan Logs", icon: "Clock" },
            { href: "/student/passes", label: "Outpass Requests", icon: "FileSpreadsheet" }
          ]
        },
        {
          groupLabel: "General Support",
          items: [
            { href: "/support", label: "Help Support", icon: "LifeBuoy" },
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
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
            { href: "/parent/passes", label: "Outpass Approvals", icon: "CheckSquare" }
          ]
        },
        {
          groupLabel: "General",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    case "hod":
      groups = [
        {
          groupLabel: "Department Workspace",
          items: [
            { href: "/hod", label: "HOD Dashboard", icon: "LayoutDashboard", badge: `${dept} HOD` },
            { href: "/admin/faculty", label: "Department Faculty", icon: "UserCheck" },
            { href: "/admin/students", label: "Branch Students", icon: "GraduationCap" }
          ]
        },
        {
          groupLabel: "Approvals Reports",
          items: [
            { href: "/hod/permissions", label: "HOD Approvals", icon: "CheckSquare", badge: "PENDING" },
            { href: "/hod?tab=approvals", label: "Outpass Approvals", icon: "CheckSquare", badge: "PENDING" },
            { href: "/admin/reports", label: "Branch Reports", icon: "FileSpreadsheet" }
          ]
        },
        {
          groupLabel: "General Support",
          items: [
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
      break;

    default:
      groups = [
        {
          groupLabel: "Dashboard",
          items: [
            { href: "/admin", label: "Campus Dashboard", icon: "LayoutDashboard", badge: "LIVE" },
            { href: "/profile", label: "My Profile", icon: "User" },
            { href: "/about", label: "About Campus", icon: "HelpCircle" }
          ]
        }
      ];
  }

  return groups;
}
