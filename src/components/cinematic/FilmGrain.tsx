"use client";

const GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter>` +
    `<rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
  );

export function FilmGrain({ opacity = 0.035 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{
        backgroundImage: `url("${GRAIN}")`,
        backgroundRepeat: "repeat",
        opacity,
        mixBlendMode: "overlay",
      }}
    />
  );
}
