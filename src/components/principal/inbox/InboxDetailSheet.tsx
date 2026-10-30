"use client";

import { useCallback, useState } from "react";
import { X, AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionDetailPanel } from "@/components/approver/PermissionDetailPanel";
import { clearCache } from "@/hooks/useApiResource";

export interface InboxDetailSheetProps {
  ticket: string | null;
  onClose: () => void;
  onActionComplete?: () => void;
}

/**
 * InboxDetailSheet — bottom sheet on mobile, side panel on md+.
 * Wraps PermissionDetailPanel for the inbox experience.
 */
export function InboxDetailSheet({ ticket, onClose, onActionComplete }: InboxDetailSheetProps) {
  if (!ticket) return null;

  return (
    <>
      {/* Mobile: bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="max-h-[85vh] overflow-y-auto bg-[var(--bg-surface)] border-t border-[var(--border)] rounded-t-2xl shadow-2xl p-4 space-y-3">
          {/* Drag handle */}
          <div className="flex justify-center">
            <div className="w-10 h-1.5 rounded-full bg-[var(--border)]" />
          </div>
          <PermissionDetailPanel
            ticket={ticket}
            onClose={onClose}
            onActionComplete={onActionComplete}
            isStandalonePage
          />
        </div>
      </div>

      {/* Desktop: side panel */}
      <div className="hidden md:block fixed inset-y-0 right-0 z-50 w-full max-w-md">
        <div className="h-full overflow-y-auto bg-[var(--bg-surface)] border-l border-[var(--border)] shadow-2xl p-4">
          <PermissionDetailPanel
            ticket={ticket}
            onClose={onClose}
            onActionComplete={onActionComplete}
            isStandalonePage
          />
        </div>
      </div>

      {/* Overlay for mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
      />
    </>
  );
}
