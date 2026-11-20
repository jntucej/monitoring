/**
 * shared/events/EventFeedbackSheet.tsx — the VERIFY step of the event
 * loop: rate an attended event (1-5) + tag chips + note. POSTs to
 * /api/campus/events/[id]/feedback. Shows the existing rating when set.
 */

"use client";

import { useEffect, useState } from "react";
import { Star, X, Loader2, Check } from "lucide-react";
import { cn, getAuthHeaders } from "@/lib/utils";

export interface EventFeedbackSheetProps {
  event: { id: string; title: string; attendedAt?: string } | null;
  onClose: () => void;
  className?: string;
}

const TAGS = ["Great", "Learned a lot", "Organized", "Crowded", "Long wait", "Good food", "Inspiring", "Could improve"];

export function EventFeedbackSheet({ event, onClose, className }: EventFeedbackSheetProps) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [existing, setExisting] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setRating(0);
    setTags([]);
    setNote("");
    setDone(false);
  }, [event?.id]);

  if (!event) return null;

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length < 4 ? [...prev, t] : prev));

  const submit = async () => {
    if (rating < 1 || saving) return;
    setSaving(true);
    try {
      await fetch(`/api/campus/events/${event.id}/feedback`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ rating, tags, note: note || undefined }),
      });
      setDone(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center", className)}>
      <div className="w-full rounded-t-xl bg-bg-elevated p-4 sm:max-w-md sm:rounded-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-text-muted">Event feedback</p>
            <h3 className="text-base font-semibold text-text-primary">{event.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-text-muted hover:bg-bg" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="flex items-center gap-2 py-6 text-sm text-green-400">
            <Check className="h-4 w-4" /> Thanks — your rating is in. It feeds your achievements + the organizer's view.
          </div>
        ) : (
          <>
            {/* Rating */}
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">How was it?</p>
              <div className="mt-1 flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setRating(s)} aria-label={`${s} stars`}>
                    <Star
                      className={cn("h-6 w-6", rating >= s ? "fill-amber-400 text-amber-400" : "text-text-muted/40")}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Tags (optional, max 4)</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      tags.includes(t)
                        ? "border-action-primary/40 bg-action-primary/10 text-action-primary"
                        : "border-border text-text-muted hover:bg-bg",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Anything to add? (optional)"
              className="mt-3 w-full rounded-lg border border-border bg-bg p-2 text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-action-primary"
            />

            <button
              type="button"
              onClick={submit}
              disabled={rating < 1 || saving}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-action-primary px-4 py-2 text-sm font-medium text-white hover:bg-action-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit feedback"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default EventFeedbackSheet;
