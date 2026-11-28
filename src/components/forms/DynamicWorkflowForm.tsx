"use client";

import { useMemo, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";

/**
 * DynamicWorkflowForm — schema-driven form renderer.
 *
 * Reads the JSON Schema from /api/config/catalog (workflowSchemas layer) and
 * renders the matching HeroUI inputs. No hardcoded field definitions: adding
 * a new workflow row to workflow_definitions is all that's needed.
 *
 * HeroUI v3 components are used (Select, Input, Textarea, Checkbox, Button).
 */

interface JsonSchemaProperty {
  type?: string;
  title?: string;
  enum?: string[];
  format?: string;
  minimum?: number;
  minLength?: number;
  default?: unknown;
}

interface WorkflowSchemaPayload {
  name: string;
  approvalChain?: Array<{
    step_order?: number;
    role?: string | string[];
    required?: boolean;
    timeout_hours?: number | null;
  }>;
  formSchema?: {
    required?: string[];
    properties?: Record<string, JsonSchemaProperty>;
  };
}

interface DynamicWorkflowFormProps {
  workflowKey: string;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  submitLabel?: string;
}

export function DynamicWorkflowForm({
  workflowKey,
  onSubmit,
  submitLabel = "Submit Request",
}: DynamicWorkflowFormProps) {
  const { data: catalogRes, loading } = useApiResource<{
    data?: { workflowSchemas?: Array<{ key: string; name: string; states: Record<string, unknown>; formSchema: Record<string, unknown> }> };
  }>("/api/config/catalog");

  // The catalog returns workflowSchemas as an array of { key, name, states, formSchema }.
  // Find the matching workflow by key.
  const workflow = useMemo(() => {
    const arr = catalogRes?.data?.workflowSchemas;
    if (!Array.isArray(arr)) return null;
    return arr.find((w) => w.key === workflowKey) as unknown as WorkflowSchemaPayload | null;
  }, [catalogRes, workflowKey]);

  const properties = useMemo(
    () => (workflow?.formSchema?.properties ?? {}) as Record<string, JsonSchemaProperty>,
    [workflow],
  );
  const requiredFields = useMemo(
    () => new Set(workflow?.formSchema?.required ?? []),
    [workflow],
  );

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="p-4 rounded-2xl border border-slate-300 bg-white text-xs font-semibold text-slate-700">
        Loading workflow rules from backend…
      </div>
    );
  }

  if (!workflow || Object.keys(properties).length === 0) {
    return (
      <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-900">
        Workflow schema is not configured yet for this action.
      </div>
    );
  }

  const handleFieldChange = (key: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    for (const reqKey of requiredFields) {
      const v = values[reqKey] ?? properties[reqKey]?.default;
      if (v === undefined || v === null || String(v).trim() === "") {
        setErrorMsg(`${properties[reqKey]?.title ?? reqKey} is required.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
      setValues({});
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="rounded-2xl border border-slate-300 bg-white p-4 space-y-4 text-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <h3 className="text-sm font-bold text-slate-900">{workflow.name}</h3>
        {Array.isArray(workflow.approvalChain) && workflow.approvalChain.length > 0 && (
          <span className="text-[11px] font-semibold text-slate-600">
            {workflow.approvalChain.length}-stage approval chain
          </span>
        )}
      </div>

      <div className="space-y-3">
        {Object.entries(properties).map(([key, prop]) => {
          const label = prop.title ?? key;
          const isRequired = requiredFields.has(key);
          const currentVal = values[key] ?? prop.default ?? "";

          // Enum -> Select
          if (prop.enum && prop.enum.length > 0) {
            return (
              <div key={key} className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {label}
                  {isRequired && <span className="text-rose-500"> *</span>}
                </label>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-slate-500 focus:outline-none"
                  value={String(currentVal)}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                >
                  <option value="">— Select —</option>
                  {prop.enum.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          // Boolean -> Checkbox
          if (prop.type === "boolean") {
            return (
              <label key={key} className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={Boolean(currentVal)}
                  onChange={(e) => handleFieldChange(key, e.target.checked)}
                  className="rounded border-slate-300 text-slate-900"
                />
                {label}
              </label>
            );
          }

          // Textarea (minLength >= 10 or format=textarea)
          if (prop.format === "textarea" || (prop.minLength && prop.minLength >= 10)) {
            return (
              <div key={key} className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {label}
                  {isRequired && <span className="text-rose-500"> *</span>}
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-500 focus:outline-none"
                  rows={3}
                  value={String(currentVal)}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                />
              </div>
            );
          }

          // Standard input (date, datetime, number, text)
          const inputType =
            prop.format === "date"
              ? "date"
              : prop.format === "date-time"
              ? "datetime-local"
              : prop.type === "integer" || prop.type === "number"
              ? "number"
              : "text";

          return (
            <div key={key} className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {label}
                {isRequired && <span className="text-rose-500"> *</span>}
              </label>
              <input
                type={inputType}
                min={prop.minimum}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-500 focus:outline-none"
                value={String(currentVal)}
                onChange={(e) =>
                  handleFieldChange(key, inputType === "number" ? Number(e.target.value) : e.target.value)
                }
              />
            </div>
          );
        })}
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {submitting ? "Submitting…" : submitLabel}
      </button>
    </form>
  );
}
