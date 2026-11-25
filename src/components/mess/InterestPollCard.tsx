"use client";

/**
 * InterestPollCard — a resident's "are you interested in this new dish?"
 * vote card. One tap casts the vote (POST /api/mess/menu-items/[id]/interest).
 * Aggregates are NOT shown to residents (that would out voters); the
 * card only shows the item + the vote buttons + "your vote" once cast.
 */
import { useCallback, useState } from "react";
import { Check, ThumbsDown, ThumbsUp, HelpCircle, Loader2 } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

interface PollCardProps {
  weeklyItemId: string;
  itemName: string;
  pollId: string;
  closesAt: string;
  /** The user's own cast vote, if any (null = not voted yet). */
  myVote?: "yes" | "no" | "maybe" | null;
}

export function InterestPollCard({
  weeklyItemId,
  itemName,
  closesAt,
  myVote,
}: PollCardProps) {
  const [casting, setCasting] = useState(false);
  const [cast, setCast] = useState(myVote ?? null);
  const [err, setErr] = useState<string | null>(null);

  const vote = useCallback(
    async (v: "yes" | "no" | "maybe") => {
      setCasting(true);
      setErr(null);
      try {
        const res = await fetch(`/api/mess/menu-items/${weeklyItemId}/interest`, {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ vote: v }),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
        setCast(v);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "failed");
      } finally {
        setCasting(false);
      }
    },
    [weeklyItemId]
  );

  const closed = new Date(closesAt).getTime() < Date.now();

  return (
    <WidgetBoundary>
      <div className="surface-card p-3 space-y-2">
        <div className="text-xs text-action-muted flex items-center justify-between">
          <span>New dish</span>
          <span>{new Date(closesAt).toLocaleString("en-IN", { day: "numeric", month: "short" })} closes</span>
        </div>
        <div className="text-sm font-semibold">{itemName}</div>

        {err && <div className="text-xs text-action-warning">{err}</div>}

        {closed ? (
          <div className="text-xs text-action-muted">Poll closed.</div>
        ) : cast ? (
          <div className="text-xs text-action-emphasis flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-action-primary" />
            You voted “{cast}”
          </div>
        ) : (
          <div className="flex gap-2">
            {([
              ["yes", ThumbsUp],
              ["maybe", HelpCircle],
              ["no", ThumbsDown],
            ] as const).map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => vote(v)}
                disabled={casting}
                className="surface-card min-h-11 inline-flex items-center gap-1 px-3 text-xs font-semibold disabled:opacity-50"
                aria-label={`Vote ${v}`}
              >
                <Icon className="w-3.5 h-3.5" /> {v}
              </button>
            ))}
            {casting && <Loader2 className="w-4 h-4 animate-spin text-action-muted" />}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}
