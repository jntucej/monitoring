"use client";

/**
 * RoleChrome — the shared shell chrome: a bottom status strip (role-specific
 * live counts), a command-palette trigger, and a "K" hint.
 *
 * Mounted by RoleDesktopShell (desktop footer) and RoleMobileShell (a compact
 * bottom bar). All data + the palette resolve through useRoleConsoleChrome —
 * the same live endpoints the pages' boards use (shared cache, no extra
 * traffic).
 */

import { Command } from "lucide-react";
import { useRoleConsoleChrome } from "@/hooks/useRoleConsoleChrome";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { CommandBar as GenericCommandBar } from "@/components/shared/CommandBar";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

import { OieStatusBar, type OieCounts } from "@/components/approver/OieStatusBar";
import { ExamSuperintendentStatusBar, type ExamSuperintendentCounts } from "@/components/approver/ExamSuperintendentStatusBar";
import { ExamBranchStatusBar, type ExamBranchCounts } from "@/components/approver/ExamBranchStatusBar";
import { CaretakerStatusBar, type CaretakerCounts } from "@/components/approver/CaretakerStatusBar";
import { HostelManagerStatusBar, type HostelManagerCounts } from "@/components/approver/HostelManagerStatusBar";
import { StaffStatusBar, type StaffCounts } from "@/components/approver/StaffStatusBar";
import { ParentStatusBar, type ParentCounts } from "@/components/approver/ParentStatusBar";
import { WorkerStatusBar, type WorkerCounts } from "@/components/approver/WorkerStatusBar";
import { SupervisorStatusBar, type SupervisorCounts } from "@/components/approver/SupervisorStatusBar";
import { MessInchargeStatusBar, type MessInchargeCounts } from "@/components/approver/MessInchargeStatusBar";
import { AdminStatusBar, type AdminCounts } from "@/components/approver/AdminStatusBar";
import { PrincipalStatusBar, type PrincipalCounts } from "@/components/approver/PrincipalStatusBar";
import { VpStatusBar, type VpCounts } from "@/components/approver/VpStatusBar";
import { SysadminStatusBar, type SysadminCounts } from "@/components/approver/SysadminStatusBar";


interface RoleChromeProps {
  /** The manifest role (e.g. "oie", "staff", "guardian"). */
  role: string;
  /** Desktop: renders a full-width sticky footer. */
  variant?: "footer" | "mobile";
  /** Extra classes (the desktop shell pins it). */
  className?: string;
}


function renderBar(chrome: ReturnType<typeof useRoleConsoleChrome>): React.ReactNode {
  const { kind, counts, lastScan, refreshing } = chrome;
  const c = counts as Record<string, unknown> | null;
  switch (kind) {
    case "oie":
      return <OieStatusBar counts={(c as OieCounts | null)} lastScan={lastScan} refreshing={refreshing} />;
    case "exam_superintendent":
      return <ExamSuperintendentStatusBar counts={(c as ExamSuperintendentCounts | null)} lastScan={lastScan} refreshing={refreshing} />;
    case "exam_branch":
      return <ExamBranchStatusBar counts={(c as ExamBranchCounts | null)} lastScan={lastScan} refreshing={refreshing} />;
    case "caretaker":
      return <CaretakerStatusBar counts={(c as CaretakerCounts | null)} refreshing={refreshing} />;
    case "hostel_manager":
      return <HostelManagerStatusBar counts={(c as HostelManagerCounts | null)} refreshing={refreshing} />;
    case "staff":
      return <StaffStatusBar counts={(c as StaffCounts | null)} refreshing={refreshing} />;
    case "parent":
      return <ParentStatusBar counts={(c as ParentCounts | null)} lastScan={lastScan} refreshing={refreshing} />;
    case "worker":
      return <WorkerStatusBar counts={(c as WorkerCounts | null)} lastScan={lastScan} refreshing={refreshing} />;
    case "supervisor":
      return <SupervisorStatusBar counts={(c as SupervisorCounts | null)} lastScan={lastScan} refreshing={refreshing} />;
    case "mess_incharge":
      return <MessInchargeStatusBar counts={(c as MessInchargeCounts | null)} refreshing={refreshing} />;
    case "admin":
      return <AdminStatusBar counts={(c as AdminCounts | null)} lastScan={lastScan} refreshing={refreshing} />;
    case "principal":
      return <PrincipalStatusBar counts={(c as PrincipalCounts | null)} lastScan={lastScan} refreshing={refreshing} />;
    case "vice_principal":
      return <VpStatusBar counts={(c as VpCounts | null)} lastScan={lastScan ?? null} refreshing={refreshing} />;
    case "sysadmin":
      return <SysadminStatusBar counts={(c as SysadminCounts | null)} lastScan={lastScan} refreshing={refreshing} />;
    default:
      return null;
  }
}

export function RoleChrome({ role, variant = "footer", className }: RoleChromeProps) {
  const chrome = useRoleConsoleChrome(role);
  const CommandBar = chrome.CommandBar ?? GenericCommandBar;

  // Global shortcuts: Cmd/Ctrl+K toggles the palette, Escape closes it.
  // Mirrors RoleConsole's useKeyboardShortcuts wiring so the shell has the
  // same keyboard experience.
  const shortcuts = useMemo(
    () => [
      {
        key: "k",
        mod: true,
        handler: () => chrome.setCommandBarOpen((o: boolean) => !o),
      },
      {
        key: "Escape",
        handler: () => {
          if (chrome.commandBarOpen) chrome.setCommandBarOpen(false);
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chrome.commandBarOpen],
  );
  useKeyboardShortcuts(shortcuts);

  if (variant === "mobile") {
    // Mobile: a thin trigger row. The status counts are not all of them fit a
    // 12px bar, so the mobile variant shows a compact command trigger + the
    // role's bar (its own layout handles the wrapping).
    return (
      <div className={cn("shrink-0 border-t bg-bg-surface/95 backdrop-blur-md", className)}>
        {chrome.kind !== "generic" ? (
          <div className="px-2 py-1.5">{renderBar(chrome)}</div>
        ) : null}
        <button
          type="button"
          onClick={() => chrome.setCommandBarOpen(true)}
          aria-label="Open command menu"
          className="flex w-full items-center justify-center gap-2 py-1.5 text-xs text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
        >
          <Command className="size-3.5" />
          <span className="font-medium">Command menu</span>
          <kbd className="rounded border border-border px-1 font-mono text-[10px] text-text-muted">
            {typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘" : "Ctrl+"}K
          </kbd>
        </button>
        <CommandBar
          role={role}
          open={chrome.commandBarOpen}
          onClose={() => chrome.setCommandBarOpen(false)}
        />
      </div>
    );
  }

  // Desktop footer.
  return (
    <div className={cn("sticky bottom-0 z-30 border-t bg-bg-surface/95 backdrop-blur-md", className)}>
      {chrome.kind !== "generic" ? (
        <div className="px-4">{renderBar(chrome)}</div>
      ) : null}
      <button
        type="button"
        onClick={() => chrome.setCommandBarOpen(true)}
        aria-label="Open command menu (Ctrl+K)"
        className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
      >
        <Command className="size-3.5" />
        <span>Commands</span>
        <kbd className="rounded border border-border px-1 font-mono text-[10px]">⌘K</kbd>
      </button>
      {chrome.refreshing && chrome.kind !== "generic" ? (
        <span className="sr-only" role="status">Refreshing live counts</span>
      ) : null}
      <CommandBar
        role={role}
        open={chrome.commandBarOpen}
        onClose={() => chrome.setCommandBarOpen(false)}
      />
    </div>
  );
}

export default RoleChrome;
