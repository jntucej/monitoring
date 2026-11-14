"use client";

/**
 * Three subtle CSS bars that pulse while the mic is listening.
 *
 * Replaces the previous @react-three/fiber + three.js particle-field
 * implementation, which pulled ~500KB of 3D engine JS to animate a
 * 2-second listening state. Three 1px bars at 3.2s loop, ~1KB of CSS,
 * no JS runtime. Calm, purposeful — matches the "quiet library desk
 * attendant" bot philosophy: a listening indicator, not a particle show.
 *
 * Respects prefers-reduced-motion: bars stop pulsing and sit static.
 */
export function ListeningParticles({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none
                 flex items-end gap-[3px] h-4"
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-[2.5px] rounded-full bg-[var(--chrome-mid, var(--color-border-strong))]
                     listening-bar"
          style={{ animationDelay: `${i * 0.22}s`, height: 8 }}
        />
      ))}
    </div>
  );
}

// Minimal inline keyframes — no global stylesheet dependency so this stays
// self-contained if the file gets moved or split out.
const styleTag = `
@keyframes listening-bar-pulse {
  0%, 100% { height: 4px; opacity: 0.35; }
  50%      { height: 14px; opacity: 1; }
}
.listening-bar {
  animation: listening-bar-pulse 1.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .listening-bar { animation: none; height: 8px; opacity: 0.6; }
}
`;

// Inject once, on the server, to keep the CSS out of every bundle chunk.
// (Import is side-effect-free; React dedupes identical <style> content
// across the client if this file is lazy-loaded per panel open.)
if (typeof document !== "undefined" && !document.getElementById("listening-bar-style")) {
  const s = document.createElement("style");
  s.id = "listening-bar-style";
  s.textContent = styleTag;
  document.head.appendChild(s);
}
// Self-contained: no external CSS file dependency.
export {};
