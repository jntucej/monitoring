export function HorizonGlow({ accent = "#67e8f9" }: { accent?: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
      style={{ background: `linear-gradient(to top, ${accent}12, transparent)` }}
    />
  );
}
