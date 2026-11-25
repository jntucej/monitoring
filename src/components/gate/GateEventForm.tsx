"use client";
/**
 * GateEventForm — blueprint-driven gate-event form.
 *
 * Renders fields from the `gate_field_blueprints` table for the current
 * role / gate / event type. No field is hard-coded here: the server is the
 * single source of truth for which fields a role sees and how each is
 * filled (auto, scan, premade, capture, required, optional, derived).
 *
 *  - `premade` fields are dropdowns sourced from `ref_categories` (loaded
 *    in one shot via the `refOptions` prop, which the parent fetches from
 *    GET /api/gate/events alongside the blueprint).
 *  - `auto` / `derived` fields are read-only (server-computed; the client
 *    never supplies them — the recorder strips them).
 *  - `scan` / `required` / `optional` are plain inputs.
 *  - `capture` is a file input (photo / signature / ID scan / plate).
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import type { FieldBlueprint, RefCategory } from "@/lib/gate/blueprints";

export interface GateEventFormProps {
  role: string;
  gateType: string;
  eventType: string;
  context?: string;
  /**
   * Called on submit with the form values. The parent is responsible for
   * POSTing to /api/gate/events and handling the response.
   */
  onSubmit: (payload: Record<string, unknown>) => Promise<void> | void;
  /**
   * When true, the form loads its blueprint + refOptions from
   * GET /api/gate/events. When false (and blueprints/refOptions are passed
   * as props), it renders immediately.
   */
  autoLoad?: boolean;
  blueprints?: FieldBlueprint[];
  refOptions?: Record<string, RefCategory[]>;
}

export function GateEventForm(props: GateEventFormProps) {
  const [bp, setBp] = useState<FieldBlueprint[]>(props.blueprints ?? []);
  const [refs, setRefs] = useState<Record<string, RefCategory[]>>(
    props.refOptions ?? {}
  );
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(props.autoLoad ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.autoLoad) return;
    (async () => {
      try {
        const qs = new URLSearchParams({
          role: props.role,
          gateType: props.gateType,
          eventType: props.eventType,
          context: props.context ?? "default",
        });
        const res = await fetch(`/api/gate/events?${qs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setBp(data.blueprint ?? []);
        setRefs(data.refOptions ?? {});
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [props.role, props.gateType, props.eventType, props.context, props.autoLoad]);

  // A field is visible when every key/value in its visible_when matches the
  // current form state. (Empty visible_when = always visible.)
  const isVisible = useMemo(() => {
    return (f: FieldBlueprint) => {
      const w = f.visibleWhen ?? {};
      return Object.entries(w).every(([k, v]) => form[k] === v);
    };
  }, [form]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted py-4">
        <Loader2 className="size-4 animate-spin" />
        <span>Loading field blueprint…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-action-danger" role="alert">
        {error}
      </div>
    );
  }

  const visibleFields = bp.filter(isVisible);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
          await props.onSubmit(form);
          setForm({});
        } catch (err) {
          setError(String(err instanceof Error ? err.message : err));
        } finally {
          setSubmitting(false);
        }
      }}
      className="space-y-3"
    >
      {visibleFields.map((f) => (
        <FieldRow
          key={f.fieldKey}
          f={f}
          value={form[f.fieldKey]}
          refOptions={f.refDomain ? refs[f.refDomain] : undefined}
          onChange={(v) => setForm((s) => ({ ...s, [f.fieldKey]: v }))}
        />
      ))}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-action-primary px-3 py-1.5 text-sm font-medium text-bg-surface disabled:opacity-50"
        >
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Record event
        </button>
        {bp.length === 0 && (
          <span className="text-xs text-text-muted">
            No blueprint fields configured for this role / event.
          </span>
        )}
      </div>
    </form>
  );
}

interface FieldRowProps {
  f: FieldBlueprint;
  value: unknown;
  refOptions?: RefCategory[];
  onChange: (v: unknown) => void;
}

function FieldRow({ f, value, refOptions, onChange }: FieldRowProps) {
  // auto / derived: read-only, server-computed.
  if (f.fillMode === "auto" || f.fillMode === "derived") {
    return (
      <label className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 text-text-muted">
          <Lock className="size-3" aria-hidden />
          {f.label}
        </span>
        <span className="font-mono text-xs text-text-primary">
          {value != null && value !== "" ? String(value) : "—"}
        </span>
      </label>
    );
  }

  const strValue = String(value ?? "");

  if (f.fillMode === "premade") {
    return (
      <label className="block text-sm">
        <span className="mb-1 block text-text-secondary">
          {f.label}
          {f.required && <span className="text-action-danger"> *</span>}
        </span>
        <select
          required={f.required}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg-surface px-2.5 py-1.5 text-sm text-text-primary"
        >
          <option value="">—</option>
          {refOptions?.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (f.fillMode === "capture") {
    return (
      <label className="block text-sm">
        <span className="mb-1 block text-text-secondary">{f.label}</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="block w-full text-xs text-text-muted file:mr-2 file:rounded file:border-0 file:bg-action-primary file:px-2 file:py-1 file:text-xs file:text-bg-surface"
        />
      </label>
    );
  }

  if (f.fillMode === "scan") {
    return (
      <label className="block text-sm">
        <span className="mb-1 block text-text-secondary">
          {f.label}
          {f.required && <span className="text-action-danger"> *</span>}
        </span>
        <input
          autoFocus={f.sortOrder === 10}
          required={f.required}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Scan / type ID"
          className="w-full rounded-lg border border-border bg-bg-surface px-2.5 py-1.5 text-sm text-text-primary"
        />
      </label>
    );
  }

  // required / optional — plain text.
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-text-secondary">
        {f.label}
        {f.required && <span className="text-action-danger"> *</span>}
      </span>
      <input
        required={f.required}
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-bg-surface px-2.5 py-1.5 text-sm text-text-primary"
      />
    </label>
  );
}
