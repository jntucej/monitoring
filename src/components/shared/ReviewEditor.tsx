/**
 * ReviewEditor — star picker + comment + optional tag chips + reason field.
 * On submit, calls `onSave` with the updated ReviewData. Used inside
 * <ReviewCard> edit mode or as a standalone editor.
 */
"use client";

import React, { useState } from "react";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewData } from "./ReviewCard";

export interface ReviewEditorProps {
  /** Pre-fill when editing an existing review */
  initial?: ReviewData;
  /** Available tag chips (optional) */
  tagOptions?: string[];
  /** Required when not editing */
  onSave: (review: ReviewData) => Promise<void> | void;
  onCancel?: () => void;
  /** Edit mode: show reason field (audit trail). */
  isEdit?: boolean;
  className?: string;
}

export function ReviewEditor({
  initial,
  tagOptions = [],
  onSave,
  onCancel,
  isEdit = false,
  className,
}: ReviewEditorProps) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const handleSave = async () => {
    if (rating === 0) return setError("Select a star rating");
    if (isEdit && !reason.trim()) return setError("Reason required for edits");
    setBusy(true);
    setError(null);
    try {
      await onSave({
        rating,
        comment: comment.trim() || undefined,
        tags: tags.length ? tags : undefined,
        createdAt: initial?.createdAt ?? new Date().toISOString(),
        editedAt: isEdit ? new Date().toISOString() : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const activeStars = hover || rating;

  return (
    <div className={cn("surface-card rounded-xl p-4", className)}>
      <div>
        <p className="text-xs font-medium text-text-muted mb-1.5">Rating</p>
        <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(i)}
              className="focus:outline-none"
            >
              <Star
                className={cn(
                  "h-6 w-6 transition-colors",
                  i <= activeStars ? "fill-amber-400 text-amber-400" : "text-text-muted/30"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label className="text-xs font-medium text-text-muted" htmlFor="review-comment">
          Comment <span className="opacity-60">(optional)</span>
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="What stood out?"
          className="mt-1 w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-action-primary"
        />
      </div>

      {tagOptions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-text-muted mb-1.5">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                  tags.includes(t)
                    ? "bg-action-primary border-action-primary text-white"
                    : "border-border text-text-secondary hover:bg-bg-elevated"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {isEdit && (
        <div className="mt-3">
          <label className="text-xs font-medium text-text-muted" htmlFor="review-reason">
            Reason for edit <span className="text-rose-500">*</span>
          </label>
          <input
            id="review-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this being changed?"
            className="mt-1 w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-action-primary"
          />
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || rating === 0}
          className="rounded-lg bg-action-primary px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : isEdit ? "Save edit" : "Submit review"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default ReviewEditor;
