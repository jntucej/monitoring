/**
 * ReviewCard — 5-star display + optional comment + tag chips.
 * Pair with <ReviewEditor /> for the edit flow.
 */
import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReviewData {
  rating: number; // 1-5
  comment?: string;
  tags?: string[];
  authorName?: string;
  authorRole?: string;
  createdAt: string;
  editedAt?: string;
}

export interface ReviewCardProps {
  review: ReviewData;
  /** Show the "edited" indicator. Default true. */
  showEditedBadge?: boolean;
  className?: string;
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("inline-flex gap-0.5", className)} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i <= value ? "fill-amber-400 text-amber-400" : "text-text-muted/30"
          )}
        />
      ))}
    </div>
  );
}

export function ReviewCard({
  review,
  showEditedBadge = true,
  className,
}: ReviewCardProps) {
  const edited = showEditedBadge && review.editedAt;
  return (
    <div className={cn("surface-card rounded-xl p-3", className)}>
      <div className="flex items-center justify-between">
        <Stars value={review.rating} />
        {review.authorName && (
          <span className="text-xs text-text-muted">
            {review.authorName}
            {review.authorRole ? ` · ${review.authorRole}` : ""}
          </span>
        )}
      </div>
      {review.comment && <p className="mt-1.5 text-sm text-text-secondary">{review.comment}</p>}
      {review.tags && review.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {review.tags.map((t) => (
            <span key={t} className="rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] font-medium text-text-muted">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-[10px] text-text-muted">
        <span>{new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        {edited && (
          <span className="text-amber-500">
            edited {new Date(review.editedAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>
    </div>
  );
}

export { Stars };
export default ReviewCard;
