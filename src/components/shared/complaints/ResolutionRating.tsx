/**
 * shared/complaints/ResolutionRating.tsx — "Was this resolution helpful?"
 * star rating after a complaint/pass is resolved. Step 5 (VERIFY) of the
 * complaint loop. Also used for pass return feedback.
 */

"use client";

import { useState } from "react";
import { Star, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/utils";

export interface ResolutionRatingProps {
  /** The entity kind (drives the API endpoint). */
  kind: "complaint" | "pass";
  /** The entity id. */
  id: string;
  /** Existing rating (0–5) when already rated. */
  existing?: number | null;
  /** Label (default "Rate this resolution"). */
  label?: string;
  className?: string;
}

export function ResolutionRating({
  kind,
  id,
  existing,
  label = "Rate this resolution",
  className,
}: ResolutionRatingProps) {
  const [rating, setRating] = useState<number | null>(existing ?? null);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  const endpoint =
    kind === "complaint" ? `/api/complaints/${id}/rate` : `/api/passes/${id}/feedback`;

  const submit = async (stars: number) => {
    if (saving) return;
    setSaving(true);
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ rating: stars }),
      });
      setRating(stars);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs text-text-muted">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => submit(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            disabled={saving}
            aria-label={`${s} stars`}
          >
            <Star
              className={cn(
                "h-4 w-4 transition-colors",
                (hover || rating || 0) >= s
                  ? "fill-amber-400 text-amber-400"
                  : "text-text-muted/40",
              )}
            />
          </button>
        ))}
      </div>
      {rating && (
        <span className="flex items-center gap-0.5 text-[11px] text-green-400">
          <Check className="h-3 w-3" /> {rating}/5
        </span>
      )}
    </div>
  );
}

export default ResolutionRating;
