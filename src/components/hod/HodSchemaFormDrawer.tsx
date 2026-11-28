"use client";

/**
 * HodSchemaFormDrawer — the HOD's zero-hardcoding form renderer.
 *
 * Reads `catalog.hodOsPolicy.hodFormSchemas[formKey]` (JSON Schema + UI
 * Schema from the DB form_schemas registry) and maps each field to a
 * project primitive. Adding a new HOD form field in 2029 is a DB row —
 * this component never changes. Submit routes to POST /api/hod/os/forms/submit.
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Drawer } from "@/components/ui/drawer";
import { useCatalog } from "@/hooks/useCatalog";
import { getAuthHeaders } from "@/lib/utils";
import { invalidateApiCache } from "@/hooks/useApiResource";
import { Send, Paperclip, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  formKey: string;
  open: boolean;
  onClose: () => void;
  onSubmitted?: (formKey: string, values: Record<string, unknown>) => void;
}

type Field = {
  key: string;
  label: string;
  widget: string;
  required: boolean;
  enum?: string[];
  minLength?: number;
  maxLength?: number;
  help?: string;
};

function toFields(jsonSchema: Record<string, unknown>, uiSchema: Record<string, unknown>): Field[] {
  const props = (jsonSchema.properties ?? {}) as Record<string, { type?: string; enum?: string[]; minLength?: number; maxLength?: number }>;
  const order = (uiSchema.order ?? Object.keys(props)) as string[];
  const widgets = (uiSchema.widgets ?? {}) as Record<string, string>;
  const help = (uiSchema.help ?? {}) as Record<string, string>;
  const required = new Set((jsonSchema.required ?? []) as string[]);
  return order.map((key) => {
    const p = props[key] ?? {};
    return {
      key,
      label: key.replace(/_/g, " "),
      widget: widgets[key] ?? (p.enum ? "select" : p.type === "boolean" ? "switch" : "input"),
      required: required.has(key),
      enum: p.enum,
      minLength: p.minLength,
      maxLength: p.maxLength,
      help: help[key],
    };
  });
}

export function HodSchemaFormDrawer({ formKey, open, onClose, onSubmitted }: Props) {
  const { catalog } = useCatalog();
  const schema = catalog?.hodOsPolicy?.hodFormSchemas?.find((f) => f.key === formKey);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [touched, setTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  if (!open) return null;

  if (!schema) {
    return (
      <Drawer isOpen onClose={onClose} title="Form unavailable" placement="right">
        <div className="rounded-lg border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-800">
          No active schema for &quot;{formKey}&quot; in the HOD catalog. The form is defined by the
          campus office — contact admin to register it.
        </div>
      </Drawer>
    );
  }

  const fields = toFields(schema.jsonSchema, schema.uiSchema);
  const set = (key: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setTouched(true);
  };
  const validate = (): boolean => {
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.key];
      if (f.required && (v == null || (typeof v === "string" && v.trim() === ""))) {
        next[f.key] = "Required";
        continue;
      }
      if (typeof v === "string" && v.trim() !== "" && f.minLength != null && v.trim().length < f.minLength) {
        next[f.key] = `Minimum ${f.minLength} characters`;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const res = await fetch("/api/hod/os/forms/submit", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ formKey, payload: values }),
      });
      const json = await res.json();
      if (json.success) {
        setDone(true);
        onSubmitted?.(formKey, values);
        invalidateApiCache([`/api/hod/os/state`]);
        setTimeout(() => {
          setValues({});
          setTouched(false);
          setDone(false);
          onClose();
        }, 800);
      } else {
        setSubmitErr(json.message ?? "Submission failed");
      }
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : "Network error");
    }
    setSubmitting(false);
  };

  return (
    <Drawer isOpen onClose={onClose} title={schema.name} placement="right">
      <div className="flex flex-col gap-4">
        {schema.description && <p className="text-sm text-text-secondary">{schema.description}</p>}

        {fields.map((f) => {
          const err = touched ? errors[f.key] : undefined;
          const val = values[f.key];
          return (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary" htmlFor={`hf-${f.key}`}>
                {f.label}
                {f.required && <span className="ml-0.5 text-rose-500">*</span>}
              </label>

              {f.widget === "textarea" ? (
                <>
                  <textarea
                    id={`hf-${f.key}`}
                    rows={3}
                    value={typeof val === "string" ? val : ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    className={cn(
                      "min-h-20 w-full rounded-lg border bg-bg-surface px-3 py-2 text-sm text-text-primary",
                      err ? "border-rose-500" : "border-border",
                    )}
                  />
                  {err && <span className="text-xs text-rose-500">{err}</span>}
                </>
              ) : f.widget === "select" ? (
                <Select
                  aria-label={f.label}
                  placeholder="Select…"
                  value={typeof val === "string" ? val : undefined}
                  onChange={(v) => set(f.key, v)}
                  options={(f.enum ?? []).map((o) => ({ value: o, label: o.replace(/_/g, " ") }))}
                  error={err}
                />
              ) : f.widget === "switch" ? (
                <label className="flex items-center gap-2 text-sm text-text-primary">
                  <input
                    id={`hf-${f.key}`}
                    type="checkbox"
                    checked={Boolean(val)}
                    onChange={(e) => set(f.key, e.target.checked)}
                    className="h-4 w-4 accent-sky-600"
                  />
                  {f.label}
                </label>
              ) : f.widget === "file" ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 p-3 text-sm text-text-secondary">
                  <Paperclip className="h-4 w-4" />
                  {typeof val === "string" && val ? (
                    <span className="truncate">{val}</span>
                  ) : (
                    <span>Upload file {f.help ? `(${f.help})` : ""}</span>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    id={`hf-${f.key}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      set(f.key, file ? file.name : undefined);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById(`hf-${f.key}`)?.click()}
                    className="ml-auto text-xs font-medium text-sky-600"
                  >
                    Choose
                  </button>
                </div>
              ) : (
                <Input
                  id={`hf-${f.key}`}
                  value={typeof val === "string" ? val : val == null ? "" : String(val)}
                  onChange={(e) => set(f.key, e.target.value)}
                  error={err}
                />
              )}

              {f.help && f.widget !== "file" && f.widget !== "switch" && (
                <p className="text-xs text-text-secondary">{f.help}</p>
              )}
            </div>
          );
        })}

        {done ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Submitted — routed via the catalog workflow.
          </div>
        ) : submitErr ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-50 p-3 text-sm text-rose-800">{submitErr}</div>
        ) : (
          <div className="mt-2 flex gap-2">
            <Button variant="primary" size="sm" onClick={submit} disabled={submitting}>
              <span className="inline-flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" /> {submitting ? "Submitting…" : "Submit"}
              </span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}

        <p className="text-xs text-text-secondary">
          Field layout comes from the live HOD form schema — add fields in the DB, zero code change.
        </p>
      </div>
    </Drawer>
  );
}
