/**
 * approver/LateReturnFlag — flags a pass where the student returned
 * after curfew. Shown in the approver's detail panel; requires a
 * warden note before closing.
 */

"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { useUIStore } from "@/stores/uiStore";

export interface LateReturnFlagProps {
  request: PermissionItem;
  className?: string;
}

export function LateReturnFlag({ request, className }: LateReturnFlagProps) {
  const { addToast } = useUIStore();
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const isLateReturn = (() => {
    const studentDetails = request.student?.student_details;
    if (!studentDetails) return false;
    // Heuristic: curfew time on the student + actual scan-out time
    // In production this comes from a dedicated late_return flag on the row.
    return (request as unknown as { late_return?: boolean }).late_return === true;
  })();

  if (!isLateReturn || confirmed) return null;

  const confirm = async () => {
    if (!note.trim()) return;
    try {
      await fetch(`/api/permissions/${request.id}/late-return`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ wardenNote: note.trim() }),
      });
      setConfirmed(true);
      addToast({ variant: "success", title: "Late return logged", message: "Warden note saved to audit." });
    } catch {
      addToast({ variant: "error", title: "Failed to log", message: "Network error." });
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <div>
          <p className="text-xs font-semibold text-amber-600">Late return after curfew</p>
          <p className="text-[10px] text-text-muted">
            A warden note is required to close this flag.
          </p>
        </div>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Warden note (e.g. 'Met the student at the gate, incident recorded')"
        className="surface-card w-full bg-bg-base px-3 py-2 text-xs text-text-primary focus:outline-none resize-none"
      />
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={!note.trim()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> Log warden note
      </button>
    </div>
  );
}

export default LateReturnFlag;
