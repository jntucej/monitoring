"use client";

import React, { useState } from "react";
import { CheckCheck, XCircle, Forward } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BulkActionsBarProps {
  selectedCount: number;
  onApprove: () => Promise<void> | void;
  onReject: (comment?: string) => Promise<void> | void;
  onForward?: (comment?: string) => Promise<void> | void;
  onClear: () => void;
  isLoading?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onApprove,
  onReject,
  onForward,
  onClear,
  isLoading = false,
}: BulkActionsBarProps) {
  const [promptAction, setPromptAction] = useState<"reject" | "forward" | null>(null);
  const [comment, setComment] = useState("");

  if (selectedCount === 0) return null;

  const handleConfirmPrompt = async () => {
    if (promptAction === "reject") {
      await onReject(comment.trim() || undefined);
    } else if (promptAction === "forward" && onForward) {
      await onForward(comment.trim() || undefined);
    }
    setPromptAction(null);
    setComment("");
  };

  const handleCancelPrompt = () => {
    setPromptAction(null);
    setComment("");
  };

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-3 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center bg-[var(--action-primary)] text-white text-xs font-bold rounded-full h-6 min-w-6 px-1.5">
          {selectedCount}
        </span>
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {selectedCount === 1 ? "item selected" : "items selected"}
        </span>
      </div>

      {promptAction ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder={`Reason for bulk ${promptAction}...`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)] w-full sm:w-64"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={promptAction === "reject" ? "danger" : "primary"}
              onClick={handleConfirmPrompt}
              loading={isLoading}
              disabled={isLoading}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCancelPrompt}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Button
            size="sm"
            variant="primary"
            onClick={() => onApprove()}
            loading={isLoading}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1" />
            Approve All
          </Button>

          <Button
            size="sm"
            variant="danger"
            onClick={() => setPromptAction("reject")}
            disabled={isLoading}
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Reject All
          </Button>

          {onForward && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPromptAction("forward")}
              disabled={isLoading}
            >
              <Forward className="w-3.5 h-3.5 mr-1" />
              Forward All
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            disabled={isLoading}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
