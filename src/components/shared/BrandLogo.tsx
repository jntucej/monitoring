"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";

/**
 * BrandLogo — the single canonical brand component for JNTUH UCEJ.
 *
 * Backed by the transparent crest assets in `public/brand/`:
 *   /brand/logo.png   (navy + teal crest, 338×514)
 *   /brand/label.png  ("UCEJ / UNIVERSITY COLLEGE OF ENGINEERING JAGTIAL", 577×95)
 *
 * Self-contained: keyframes ship via an inline <style> string (deduped by
 * React). No global-CSS or new-dependency changes. Respects
 * prefers-reduced-motion (instant static render, no sweep/orbit/halo).
 *
 * Props:
 *   variant:  "mark" (crest + small text wordmark) | "lockup" (crest + image wordmark) | "monochrome"
 *   size:     "xs" | "sm" | "md" | "lg" | "hero"   (locks aspect ratio, shrink-0)
 *   motion:   "static" | "reactive" (hover sheen + ±6° tilt on fine pointers) |
 *             "cinematic" (crest rise + light sweep + ambient halo + label fade) | "loading" (orbit + breathe)
 *   status:   "idle" | "live" | "scanning" | "alert" | "offline"  (drives the halo ring / glow)
 *
 * All glow/halo/orbit layers are pointer-events:none — they never intercept clicks.
 */

export type BrandVariant = "mark" | "lockup" | "monochrome";
export type BrandSize = "xs" | "sm" | "md" | "lg" | "hero";
export type BrandMotion = "static" | "reactive" | "cinematic" | "loading";
export type BrandStatus = "idle" | "live" | "scanning" | "alert" | "offline";

export interface BrandLogoProps {
  variant?: BrandVariant;
  size?: BrandSize;
  motion?: BrandMotion;
  status?: BrandStatus;
  /** Collapse a lockup down to a bare mark (used when a sidebar collapses). */
  collapsed?: boolean;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

const CREST_RATIO = 338 / 514; // intrinsic aspect ratio — locked so it never squishes
const CREST_W: Record<BrandSize, number> = { xs: 20, sm: 30, md: 44, lg: 64, hero: 132 };
const WORD_W: Record<BrandSize, number> = { xs: 40, sm: 62, md: 84, lg: 104, hero: 168 };

const STATUS_COLOR: Record<BrandStatus, string> = {
  idle: "transparent",
  live: "#15803d",
  scanning: "#0ea5e9",
  alert: "#dc2626",
  offline: "#64748b",
};
const STATUS_SR: Record<BrandStatus, string> = {
  idle: "",
  live: "Live telemetry connected",
  scanning: "Gate scan in progress",
  alert: "Lockdown or curfew alert active",
  offline: "Offline mode",
};

const KEYFRAMES = `
@keyframes blg-crest-rise   { 0%{clip-path:inset(100% 0 0 0);transform:scale(.93) translateY(14px);opacity:0} 55%{opacity:1} 100%{clip-path:inset(0 0 0 0);transform:scale(1) translateY(0);opacity:1} }
@keyframes blg-crest-settle  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.014)} }
@keyframes blg-sweep         { 0%{transform:translateX(-130%) skewX(-18deg);opacity:0} 12%{opacity:1} 100%{transform:translateX(330%) skewX(-18deg);opacity:0} }
@keyframes blg-label-in      { 0%{opacity:0;transform:translateY(12px)} 100%{opacity:1;transform:translateY(0)} }
@keyframes blg-halo-breathe  { 0%,100%{opacity:.5;transform:scale(.94)} 50%{opacity:.82;transform:scale(1.05)} }
@keyframes blg-orbit         { from{transform:rotate(0)} to{transform:rotate(360deg)} }
@keyframes blg-flash         { 0%,100%{opacity:0} 45%{opacity:1} }
@keyframes blg-breathe       { 0%,100%{transform:scale(.96)} 50%{transform:scale(1.02)} }

.blg { position:relative; display:inline-flex; flex-direction:column; align-items:center; gap:6px; contain:layout; line-height:0; flex:none; }
.blg-tile { position:relative; display:inline-block; transition:transform 240ms cubic-bezier(.22,1,.36,1); transform-origin:50% 40%; will-change:transform; }
.blg-crest-zone { position:relative; display:block; }
.blg-crest { display:block; width:100%; height:100%; object-fit:contain; user-select:none; -webkit-user-drag:none; }
.blg-monochrome .blg-crest { filter:grayscale(1) contrast(.92) brightness(.9); }
.blg-monochrome .blg-word { filter:grayscale(1) contrast(.95); }
.blg-offline { opacity:.62; }

.blg-halo { position:absolute; inset:-24%; border-radius:50%; pointer-events:none; opacity:0;
  background:radial-gradient(circle at 50% 42%, var(--blg-halo,transparent) 0%, rgba(255,255,255,0) 62%); filter:blur(9px); }
.blg-sweep-layer { position:absolute; inset:0; overflow:hidden; pointer-events:none; border-radius:8px;
  -webkit-mask-image:var(--blg-mask); mask-image:var(--blg-mask); -webkit-mask-size:100% 100%; mask-size:100% 100%; -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; }
.blg-sweep-bar { position:absolute; top:-10%; bottom:-10%; left:0; width:40%;
  background:linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.55) 50%, rgba(255,255,255,0) 100%);
  transform:translateX(-130%) skewX(-18deg); opacity:0; }
.blg-flash-ring { position:absolute; inset:-6%; border-radius:12px; pointer-events:none; opacity:0;
  box-shadow:0 0 0 3px var(--blg-halo,transparent), 0 0 22px 4px var(--blg-halo,transparent); }
.blg-orbit { position:absolute; inset:-16%; pointer-events:none; border-radius:50%; }
.blg-orbit::before { content:""; position:absolute; top:50%; left:50%; width:8px; height:8px; margin:-4px; border-radius:50%;
  background:var(--blg-halo,#0ea5e9); box-shadow:0 0 8px 2px var(--blg-halo,#0ea5e9); }

.blg-label { display:block; width:100%; height:auto; object-fit:contain; user-select:none; -webkit-user-drag:none; }
.blg-word { display:flex; flex-direction:column; align-items:center; gap:1px; user-select:none; margin-top:3px; text-align:center; }
.blg-word-ace { font-weight:800; letter-spacing:.14em; line-height:1; color:var(--text-primary,#0f172a); }
.blg-word-sub { font-weight:500; letter-spacing:.03em; line-height:1.1; color:var(--text-muted,#64748b); text-transform:uppercase; }

/* --- motion: cinematic (crest rise + sweep + halo + label fade, one-shot) --- */
.blg-motion-cinematic .blg-crest { animation:blg-crest-rise 900ms cubic-bezier(.16,1,.3,1) both, blg-crest-settle 1400ms cubic-bezier(.45,0,.55,1) 900ms both; }
.blg-motion-cinematic .blg-sweep-bar { animation:blg-sweep 1100ms cubic-bezier(.4,0,.2,1) 480ms both; }
.blg-motion-cinematic .blg-label, .blg-motion-cinematic .blg-word { animation:blg-label-in 900ms cubic-bezier(.22,1,.36,1) 460ms both; }
.blg-motion-cinematic .blg-halo { opacity:.55; }
/* --- motion: loading (continuous orbit + gentle breathe) --- */
.blg-motion-loading .blg-orbit { animation:blg-orbit 2.6s linear infinite; }
.blg-motion-loading .blg-crest { animation:blg-breathe 2.6s ease-in-out infinite; }
/* --- motion: reactive (hover sheen + subtle halo on fine pointers) --- */
.blg-motion-reactive .blg-tile:hover .blg-sweep-bar { animation:blg-sweep 900ms ease-in-out; }
/* --- status glows --- */
.blg-status-live .blg-halo { animation:blg-halo-breathe 3.2s ease-in-out infinite; opacity:.72; }
.blg-status-scanning .blg-crest { filter:drop-shadow(0 0 7px var(--blg-halo,#0ea5e9)); }
.blg-status-alert .blg-flash-ring { animation:blg-flash 1.6s ease-in-out infinite; }
.blg-status-alert .blg-halo { opacity:.8; }
`;

function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: fine)");
    const on = () => setFine(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return fine;
}

export function BrandLogo({
  variant = "mark",
  size = "md",
  motion = "static",
  status = "idle",
  collapsed = false,
  alt = "JNTUH UCEJ — University College of Engineering Jagtial",
  className = "",
  style,
}: BrandLogoProps) {
  const reduced = usePrefersReducedMotion();
  const fine = useFinePointer();

  // lockup collapses to mark when asked or when tiny
  const asMark = variant === "lockup" && (collapsed || size === "xs");
  const activeVariant: BrandVariant = asMark ? "mark" : variant;

  const crestW = CREST_W[size];
  const crestH = crestW / CREST_RATIO;
  const wordW = WORD_W[size];
  const totalW = activeVariant === "lockup" ? crestW : wordW;

  const playReveal = !reduced && motion === "cinematic";
  const showOrbit = motion === "loading" && !reduced;
  const showHalo = !reduced && (playReveal || status !== "idle");
  const showSweep = !reduced && (playReveal || motion === "reactive");
  const tilt = motion === "reactive" && fine && !reduced;
  const accent = CREST_W[size] >= 64 ? 11 : CREST_W[size] >= 44 ? 9 : 7;

  const tileRef = useRef<HTMLDivElement>(null);
  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (!tilt) return;
      const el = tileRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(420px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg)`;
    },
    [tilt],
  );
  const onLeave = useCallback(() => {
    if (tileRef.current) tileRef.current.style.transform = "";
  }, []);

  const cls = [
    "blg",
    `blg-size-${size}`,
    `blg-motion-${motion}`,
    status !== "idle" ? `blg-status-${status}` : "",
    activeVariant === "monochrome" ? "blg-monochrome" : "",
    status === "offline" ? "blg-offline" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} style={{ width: totalW, ["--blg-halo" as string]: STATUS_COLOR[status], ...style }} role="img" aria-label={alt}>
      <style>{KEYFRAMES}</style>
      <div ref={tilt ? tileRef : undefined} className="blg-tile" onMouseMove={tilt ? onMove : undefined} onMouseLeave={tilt ? onLeave : undefined}>
        <div className="blg-crest-zone" style={{ width: crestW, height: crestH }}>
          {showHalo ? <span className="blg-halo" aria-hidden="true" /> : null}
          <img
            className="blg-crest"
            src="/brand/logo.png"
            width={338}
            height={514}
            alt=""
            draggable={false}
            loading={size === "hero" ? "eager" : "lazy"}
            decoding="async"
            style={{ opacity: playReveal ? 0 : 1 }}
          />
          {showSweep ? (
            <span className="blg-sweep-layer" aria-hidden="true" style={{ ["--blg-mask" as string]: "url(/brand/logo.png)" }}>
              <span className="blg-sweep-bar" />
            </span>
          ) : null}
          {showOrbit ? <span className="blg-orbit" aria-hidden="true" /> : null}
          {status === "alert" && !reduced ? <span className="blg-flash-ring" aria-hidden="true" /> : null}
        </div>

        {activeVariant === "lockup" ? (
          <div style={{ width: wordW }}>
            <img className="blg-label" src="/brand/label.png" width={577} height={95} alt="" draggable={false} loading="lazy" decoding="async" style={{ width: wordW }} />
          </div>
        ) : (
          <div className="blg-word" aria-hidden="true">
            <span className="blg-word-ace" style={{ fontSize: accent * 1.15 }}>
              UCEJ
            </span>
            {activeVariant === "monochrome" ? (
              <span className="blg-word-sub" style={{ fontSize: accent * 0.62 }}>
                University College of Engineering Jagtial
              </span>
            ) : null}
          </div>
        )}
      </div>
      {status !== "idle" ? <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{STATUS_SR[status]}</span> : null}
    </div>
  );
}

export default BrandLogo;
