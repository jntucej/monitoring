"use client";

import { PermissionDetailPanel } from "@/components/approver/PermissionDetailPanel";
import type { PermissionItem } from "@/components/approver/PermissionRow";

export interface DetailSheetProps {
  item: PermissionItem | null;
  onClose: () => void;
  onActionComplete?: () => void;
}

export function DetailSheet({
  item,
  onClose,
  onActionComplete,
}: DetailSheetProps) {
  if (!item) return null;

  return (
    <>
      {/* Mobile: bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-2xl space-y-3">
          <div className="flex justify-center">
            <div className="h-1.5 w-10 rounded-full bg-[var(--border)]" />
          </div>
          <PermissionDetailPanel
            ticket={item.ticket_number}
            onClose={onClose}
            onActionComplete={onActionComplete}
            isStandalonePage
          />
        </div>
      </div>

      {/* Desktop: side panel */}
      <div className="fixed inset-y-0 right-0 z-50 hidden w-full max-w-md md:block">
        <div className="h-full overflow-y-auto border-l border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-2xl">
          <PermissionDetailPanel
            ticket={item.ticket_number}
            onClose={onClose}
            onActionComplete={onActionComplete}
            isStandalonePage
          />
        </div>
      </div>

      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  );
}
