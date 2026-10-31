// SCAFFOLD:RICH-LOADING — skeleton matching the real layout's rhythm.
export default function Loading() {
  return (
    <div className="space-y-6 p-4 sm:p-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-7 w-72 animate-pulse rounded bg-[var(--bg-elevated)]" />
        <div className="h-4 w-96 animate-pulse rounded bg-[var(--bg-elevated)]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--bg-elevated)]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-[32rem] animate-pulse rounded-xl bg-[var(--bg-elevated)] lg:col-span-2" />
        <div className="h-[32rem] animate-pulse rounded-xl bg-[var(--bg-elevated)]" />
      </div>
    </div>
  );
}
