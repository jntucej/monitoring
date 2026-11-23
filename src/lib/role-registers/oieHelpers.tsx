/**
 * Helpers for OIE inspection builders.
 */
import type { InspectionSection } from "@/components/shared/EntityInspector";

export function when(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function kv(title: string, pairs: Array<[string, React.ReactNode]>): InspectionSection {
  return {
    title,
    content: (
      <dl className="space-y-1.5">
        {pairs.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-text-muted">{k}</dt>
            <dd className="text-sm text-text-primary">{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
    ),
  };
}
