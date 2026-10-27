"use client";

/**
 * Semester Recap — a shareable-looking recap card aggregating the user's
 * completed events, earned achievements and completed goals from
 * /api/campus/recap. Sharing is optional (copy-to-clipboard only) and
 * the payload deliberately excludes any sensitive movement, attendance
 * or disciplinary data.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  CalendarDays,
  Award,
  Target,
  Loader2,
  Share2,
  Download,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

interface RecapData {
  userName: string;
  role: string;
  periodLabel: string;
  completedEvents: string[];
  earnedAchievements: Array<{ code: string; title: string; icon: string | null }>;
  completedGoals: number;
  totalGoals: number;
  eventsRegistered: number;
}

function buildShareText(r: RecapData): string {
  const lines: string[] = [];
  lines.push(`🎓 ${r.periodLabel} — ${r.userName} (${r.role})`);
  lines.push("");
  if (r.completedEvents.length > 0) {
    lines.push(`📅 Events attended (${r.completedEvents.length}):`);
    for (const ev of r.completedEvents.slice(0, 8)) {
      lines.push(`  • ${ev}`);
    }
  } else {
    lines.push(`📅 Events registered: ${r.eventsRegistered}`);
  }
  if (r.earnedAchievements.length > 0) {
    lines.push(`🏆 Achievements earned (${r.earnedAchievements.length}):`);
    for (const a of r.earnedAchievements.slice(0, 8)) {
      lines.push(`  • ${a.title}`);
    }
  }
  lines.push(`✅ Goals completed: ${r.completedGoals}/${r.totalGoals}`);
  lines.push("");
  lines.push("No attendance, movement or disciplinary details included.");
  return lines.join("\n");
}

function drawRecapCanvas(r: RecapData): string {
  const W = 800;
  const H = 600;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#312e81");
  grad.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Period label
  ctx.fillStyle = "rgba(165,180,252,0.8)";
  ctx.font = "600 13px sans-serif";
  ctx.fillText(r.periodLabel, 48, 40);

  // Name + role
  ctx.fillStyle = "#e0e7ff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(r.userName, 48, 68);
  ctx.font = "500 14px sans-serif";
  ctx.fillStyle = "rgba(199,210,254,0.8)";
  ctx.fillText(r.role.toUpperCase(), 48, 104);

  // Stat tiles row
  const tiles: Array<{ label: string; value: string; accent: string }> = [
    { label: "Events joined", value: String(r.eventsRegistered), accent: "#38bdf8" },
    { label: "Badges earned", value: String(r.earnedAchievements.length), accent: "#fbbf24" },
    {
      label: "Goals done",
      value: `${r.completedGoals}/${r.totalGoals}`,
      accent: "#a78bfa",
    },
  ];
  const tileW = (W - 96) / 3;
  const tileY = 160;
  tiles.forEach((t, i) => {
    const x = 48 + i * tileW;
    ctx.fillStyle = "rgba(99,102,241,0.15)";
    ctx.beginPath();
    ctx.roundRect(x, tileY, tileW - 12, 80, 12);
    ctx.fill();
    ctx.fillStyle = t.accent;
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t.value, x + (tileW - 12) / 2, tileY + 16);
    ctx.font = "500 11px sans-serif";
    ctx.fillStyle = "rgba(199,210,254,0.7)";
    ctx.fillText(t.label.toUpperCase(), x + (tileW - 12) / 2, tileY + 52);
    ctx.textAlign = "left";
  });

  // Events list (up to 5)
  const listY = 270;
  if (r.completedEvents.length > 0) {
    ctx.fillStyle = "rgba(165,180,252,0.6)";
    ctx.font = "600 12px sans-serif";
    ctx.fillText("EVENTS", 48, listY);
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#c7d2fe";
    r.completedEvents.slice(0, 5).forEach((ev, i) => {
      ctx.fillText("• " + ev, 56, listY + 24 + i * 24);
    });
  }

  // Badges list (up to 5)
  const badgeStartY = 270 + (r.completedEvents.length > 0 ? 40 + r.completedEvents.slice(0, 5).length * 24 : 0);
  if (r.earnedAchievements.length > 0) {
    ctx.fillStyle = "rgba(165,180,252,0.6)";
    ctx.font = "600 12px sans-serif";
    ctx.fillText("BADGES", 48, badgeStartY);
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#c7d2fe";
    r.earnedAchievements.slice(0, 5).forEach((a, i) => {
      ctx.fillText("🏆 " + a.title, 56, badgeStartY + 24 + i * 24);
    });
  }

  // Footer
  ctx.fillStyle = "rgba(148,163,200,0.6)";
  ctx.font = "11px sans-serif";
  ctx.fillText("No attendance, movement or disciplinary details included.", 48, H - 32);

  return canvas.toDataURL("image/png");
}

export function SemesterRecap() {
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/campus/recap", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Failed to load recap");
      }
      setData(json.data as RecapData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load recap");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleShare() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(buildShareText(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to clipboard");
    }
  }

  async function handleDownload() {
    if (!data || typeof document === "undefined") return;
    try {
      const dataUrl = drawRecapCanvas(data);
      if (!dataUrl) throw new Error("canvas unavailable");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "recap-card.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setError("Couldn't download card");
    }
  }

  const shareable =
    (data?.completedEvents.length ?? 0) > 0 ||
    (data?.earnedAchievements.length ?? 0) > 0 ||
    (data?.completedGoals ?? 0) > 0 ||
    (data?.eventsRegistered ?? 0) > 0;

  return (
    <WidgetBoundary title="Semester Recap">
      <section
        aria-label="Semester recap"
        className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-[var(--bg-surface)] to-violet-500/10 p-5 min-w-0"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                {data?.periodLabel ?? "Semester Recap"}
              </h2>
              <p className="text-[10px] text-[var(--text-muted)]">
                Your highlight card — no sensitive details included
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={!data}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-200 hover:bg-indigo-500/25 motion-safe:transition-colors motion-reduce:transition-none disabled:opacity-50"
          >
            {copied ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
            ) : (
              <Share2 className="h-3.5 w-3.5" aria-hidden />
            )}
            {copied ? "Copied" : "Share"}
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={!data}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-200 hover:bg-indigo-500/25 motion-safe:transition-colors motion-reduce:transition-none disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Download card
          </button>
        </div>

        {loading && !data ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]" role="status">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Building your recap…
          </div>
        ) : error && !data ? (
          <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>
        ) : data ? (
          <>
            <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">
              {data.userName}
              <span className="ml-2 rounded-full bg-[var(--bg-raised)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {data.role}
              </span>
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-3 text-center">
                <CalendarDays className="mx-auto h-4 w-4 text-sky-400" aria-hidden />
                <p className="mt-1 text-lg font-bold tabular-nums">{data.eventsRegistered}</p>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  Events joined
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-3 text-center">
                <Award className="mx-auto h-4 w-4 text-amber-400" aria-hidden />
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {data.earnedAchievements.length}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  Badges earned
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-3 text-center">
                <Target className="mx-auto h-4 w-4 text-violet-400" aria-hidden />
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {data.completedGoals}/{data.totalGoals}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  Goals done
                </p>
              </div>
            </div>

            {(data.completedEvents.length > 0 || data.earnedAchievements.length > 0) && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.completedEvents.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Events
                    </p>
                    <ul className="mt-1.5 space-y-1 text-xs text-[var(--text-primary)]">
                      {data.completedEvents.slice(0, 5).map((ev) => (
                        <li key={ev} className="truncate">
                          • {ev}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.earnedAchievements.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Badges
                    </p>
                    <ul className="mt-1.5 space-y-1 text-xs text-[var(--text-primary)]">
                      {data.earnedAchievements.slice(0, 5).map((a) => (
                        <li key={a.code} className="truncate">
                          🏆 {a.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!shareable && (
              <p className="mt-4 text-xs text-[var(--text-muted)]">
                Nothing to share yet — register for an event, set a goal or earn a
                badge to light up your recap.
              </p>
            )}
          </>
        ) : null}
      </section>
    </WidgetBoundary>
  );
}
