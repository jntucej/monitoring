export type ActionId =
  | "confirm_assignment"
  | "verify_assignment"
  | "flag_class_blocker"
  | "approve_ticket"
  | "forward_ticket"
  | "reject_ticket"
  | "escalate_item"
  | "override_approve"
  | "start_work"
  | "resolve_work"
  | "serve_token"
  | "open_scanner"
  | "revoke_session"
  | "view_record";

export interface RoleActionDef {
  id: ActionId;
  label: string;
  tone: "primary" | "secondary" | "danger" | "link";
  href?: string;
  requiresNote?: boolean;
}

/**
 * Guarantees every role receives concrete, scoped actions for a record/event.
 */
export function getActionsForRole(
  role: string | undefined,
  context: {
    kind: "assignment" | "ticket" | "complaint" | "gate" | "session";
    isStageOwner?: boolean;
    recordId: string;
    ticketNumber?: string;
  },
): RoleActionDef[] {
  const r = (role ?? "student").toLowerCase();
  const tRef = context.ticketNumber ?? context.recordId;

  // CR (Class Representative)
  if (r === "cr" || r === "student_representative") {
    if (context.kind === "assignment") {
      return [
        {
          id: "confirm_assignment",
          label: "Confirm Class Readiness",
          tone: "primary",
          requiresNote: false,
        },
        {
          id: "flag_class_blocker",
          label: "Flag Class Blocker",
          tone: "secondary",
          requiresNote: true,
        },
      ];
    }
    return [
      {
        id: "flag_class_blocker",
        label: "Raise Class Issue",
        tone: "secondary",
        requiresNote: true,
      },
      {
        id: "view_record",
        label: "Open Details",
        tone: "link",
        href: "/student/assignments",
      },
    ];
  }

  // Student
  if (r === "student") {
    if (context.kind === "assignment") {
      return [
        { id: "confirm_assignment", label: "Mark Completed", tone: "primary" },
        {
          id: "flag_class_blocker",
          label: "Ask / Report Issue",
          tone: "secondary",
          requiresNote: true,
        },
      ];
    }
    return [
      {
        id: "view_record",
        label: "Track Record",
        tone: "link",
        href: `/student/passes/${context.recordId}`,
      },
    ];
  }

  // Faculty & HOD
  if (["faculty", "hod"].includes(r)) {
    if (context.kind === "assignment") {
      return [
        {
          id: "verify_assignment",
          label: "Confirm & Verify Assignments",
          tone: "primary",
        },
        {
          id: "flag_class_blocker",
          label: "Post Class Note",
          tone: "secondary",
          requiresNote: true,
        },
      ];
    }
    if (context.isStageOwner) {
      return [
        { id: "approve_ticket", label: "Approve", tone: "primary" },
        { id: "forward_ticket", label: "Forward", tone: "secondary" },
        {
          id: "reject_ticket",
          label: "Reject",
          tone: "danger",
          requiresNote: true,
        },
      ];
    }
    return [
      {
        id: "view_record",
        label: "Inspect Ticket",
        tone: "link",
        href: `/permissions/${tRef}`,
      },
    ];
  }

  // Frontline (operator, worker, caretaker, mess_incharge)
  if (r === "operator") {
    return [
      { id: "open_scanner", label: "Open Gate Desk", tone: "primary", href: "/gate" },
    ];
  }
  if (["worker", "caretaker"].includes(r)) {
    return [
      { id: "start_work", label: "Mark In Progress", tone: "secondary" },
      {
        id: "resolve_work",
        label: "Mark Resolved",
        tone: "primary",
        requiresNote: true,
      },
    ];
  }
  if (r === "mess_incharge") {
    return [{ id: "serve_token", label: "Verify & Serve Token", tone: "primary" }];
  }

  // Executive & Admin (vice_principal, principal, supervisor, admin)
  if (["vice_principal", "principal", "supervisor", "admin"].includes(r)) {
    if (context.kind === "assignment") {
      return [
        { id: "verify_assignment", label: "Confirm Status", tone: "primary" },
        {
          id: "view_record",
          label: "Manage CRs",
          tone: "link",
          href: "/admin/student-representatives",
        },
      ];
    }
    return [
      { id: "override_approve", label: "Approve / Override", tone: "primary" },
      {
        id: "escalate_item",
        label: "Escalate",
        tone: "secondary",
        requiresNote: true,
      },
      {
        id: "view_record",
        label: "Full Ticket",
        tone: "link",
        href: `/permissions/${tRef}`,
      },
    ];
  }

  // SysAdmin
  if (r === "sysadmin") {
    return [
      {
        id: "revoke_session",
        label: "Audit / Session Action",
        tone: "secondary",
        href: "/sysadmin/audit",
      },
      {
        id: "view_record",
        label: "Full Record",
        tone: "link",
        href: `/permissions/${tRef}`,
      },
    ];
  }

  // Guardian / Visitor / Other roles always get a direct scoped action
  return [
    {
      id: "view_record",
      label: r === "guardian" ? "Check Ward Status" : "Open View",
      tone: "link",
      href: r === "guardian" ? "/guardian/movement-info" : `/permissions/${tRef}`,
    },
  ];
}
