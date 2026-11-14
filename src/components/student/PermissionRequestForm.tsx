"use client";

import React, { useState } from "react";
import { Loader2, CheckCircle2, ClipboardList, FileText, CalendarClock, AlertCircle, ArrowRight } from "lucide-react";
import { ReasonSelect } from "@/components/shared/ReasonSelect";
import { useApi } from "@/hooks/useApi";
import type { WorkflowType } from "@/lib/types";

export interface PermissionRequestFormProps {
  onSubmitted?: (ticketNumber: string) => void;
  defaultWorkflow?: "hostel" | "exam" | "memo";
}

type FormWorkflow = "hostel" | "exam" | "memo";

const WORKFLOW_OPTIONS: { value: FormWorkflow; label: string }[] = [
  { value: "hostel", label: "Hostel Permission" },
  { value: "exam", label: "Exam Document" },
  { value: "memo", label: "Department Memo" },
];

/**
 * PermissionRequestForm — the student-facing form for creating a new permission
 * request (hostel / exam / memo). Consumes Step 5's `ReasonSelect` for the reason
 * dropdown (standard + custom reasons) and posts to Step 2's `POST /api/permissions`.
 * On success it renders a confirmation panel with the server-issued ticket number.
 */
export function PermissionRequestForm({ onSubmitted, defaultWorkflow = "hostel" }: PermissionRequestFormProps) {
  const api = useApi();
  const [workflowType, setWorkflowType] = useState<FormWorkflow>(defaultWorkflow);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [documentRequired, setDocumentRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  const requiresDates = workflowType === "hostel";
  const descriptionRequired = workflowType === "exam" || workflowType === "memo";
  const showDocumentCheckbox = descriptionRequired;

  const resetForm = () => {
    setReason("");
    setDescription("");
    setFromDate("");
    setToDate("");
    setDocumentRequired(false);
    setFieldErrors({});
    setError(null);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!reason) errs.reason = "Please select a reason.";
    if (descriptionRequired && !description.trim()) errs.description = "A description is required for this request type.";
    if (requiresDates) {
      if (!fromDate) errs.fromDate = "Departure date/time is required.";
      if (!toDate) errs.toDate = "Return date/time is required.";
      if (fromDate && toDate) {
        const from = new Date(fromDate).getTime();
        const to = new Date(toDate).getTime();
        if (Number.isNaN(from) || Number.isNaN(to) || to <= from) errs.toDate = "Return must be after departure.";
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...api.getHeaders() },
        body: JSON.stringify({
          workflowType,
          reason,
          description: description.trim() || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          documentRequired: showDocumentCheckbox ? documentRequired : false,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        const code = json?.error?.code ?? json?.code ?? `HTTP_${res.status}`;
        const msg =
          json?.error?.message ?? json?.message ?? "Failed to submit your request. Please try again.";
        setError(`[${code}] ${msg}`);
      } else if (json.success && json.data?.ticket_number) {
        const ticket = json.data.ticket_number as string;
        setTicketNumber(ticket);
        if (onSubmitted) onSubmitted(ticket);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Success panel ---------------- */
  if (ticketNumber) {
    return (
      <div className="surface-card bg-bg-surface p-6 md:p-8 space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="size-6 text-action-success" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-text-primary">Request Submitted</h2>
            <p className="text-xs text-text-muted">Your permission request has been created. Save this ticket number:</p>
          </div>
        </div>

        <div className="surface-card inline-flex items-center gap-2 px-5 py-3 bg-bg-elevated font-mono text-xl font-bold tracking-wider text-action-primary">
          <ClipboardList className="w-4 h-4" />
          {ticketNumber}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <a
            href="/student/permissions"
            className="surface-card px-5 py-2.5 bg-action-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:brightness-110 transition"
          >
            View My Requests
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setTicketNumber(null);
            }}
            className="surface-card px-5 py-2.5 bg-bg-elevated text-xs font-semibold text-text-primary hover:bg-bg-surface transition"
          >
            New Request
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- Form ---------------- */
  return (
    <form onSubmit={handleSubmit} className="surface-card bg-bg-surface p-5 md:p-6 space-y-5">
      {/* Workflow type */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-text-secondary">Request Type</label>
        <div className="grid grid-cols-3 gap-2">
          {WORKFLOW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setWorkflowType(opt.value);
                setReason("");
                setDocumentRequired(false);
                setFieldErrors({});
              }}
              disabled={submitting}
              className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                workflowType === opt.value
                  ? "bg-action-primary text-white border-action-primary shadow-sm"
                  : "bg-bg-elevated text-text-secondary border-border hover:bg-bg-surface"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div className="space-y-1.5">
        <label htmlFor="perm-reason" className="text-xs font-semibold text-text-secondary">
          Reason <span className="text-action-danger">*</span>
        </label>
        <ReasonSelect
          workflowType={workflowType as WorkflowType}
          value={reason}
          onChange={(code) => setReason(code)}
          required
          disabled={submitting}
          className="h-6"
        />
        {fieldErrors.reason && <p className="text-xs text-action-danger font-medium">{fieldErrors.reason}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="perm-description" className="text-xs font-semibold text-text-secondary">
          Description / Additional Notes
          {descriptionRequired ? (
            <span className="text-action-danger"> *</span>
          ) : (
            <span className="text-text-muted font-normal"> (optional)</span>
          )}
        </label>
        <textarea
          id="perm-description"
          rows={3}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add any details that help your approver decide..."
          disabled={submitting}
          className="surface-card w-full p-3 bg-bg-base text-xs font-semibold text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ringfocus-ring disabled:opacity-50"
        />
        <div className="flex justify-between items-center">
          {fieldErrors.description ? (
            <p className="text-xs text-action-danger font-medium">{fieldErrors.description}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-text-muted font-mono">{description.length}/1000</span>
        </div>
      </div>

      {/* Dates (hostel only) */}
      {requiresDates && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
            <CalendarClock className="w-3.5 h-3.5" />
            Outing Window <span className="text-action-danger">*</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="perm-from" className="text-xs text-text-muted font-medium">From (Departure)</label>
              <input
                id="perm-from"
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={submitting}
                required
                className="surface-card w-full p-2.5 bg-bg-base text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ringfocus-ring disabled:opacity-50"
              />
              {fieldErrors.fromDate && <p className="text-xs text-action-danger font-medium">{fieldErrors.fromDate}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="perm-to" className="text-xs text-text-muted font-medium">To (Return)</label>
              <input
                id="perm-to"
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate || undefined}
                disabled={submitting}
                required
                className="surface-card w-full p-2.5 bg-bg-base text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ringfocus-ring disabled:opacity-50"
              />
              {fieldErrors.toDate && <p className="text-xs text-action-danger font-medium">{fieldErrors.toDate}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Document required (exam / memo only) */}
      {showDocumentCheckbox && (
        <div className="space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={documentRequired}
              onChange={(e) => setDocumentRequired(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 w-4 h-4 rounded border-border accent-[var(--action-primary)] cursor-pointer"
            />
            <span className="text-xs font-semibold text-text-secondary group-hover:text-text-primary transition">
              A document is required for this request
            </span>
          </label>
          {documentRequired && (
            <div className="surface-card flex items-start gap-2 p-3 bg-amber-500/10">
              <FileText className="w-4 h-4 text-action-warning shrink-0 mt-0.5" />
              <p className="text-xs text-action-warning font-medium leading-relaxed">
                You will be able to upload the document after HOD approval.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="surface-card flex items-start gap-2 p-3 bg-rose-500/10">
          <AlertCircle className="w-4 h-4 text-action-danger shrink-0 mt-0.5" />
          <p className="text-xs text-action-danger font-medium">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="surface-card w-full py-3 bg-action-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition disabled:opacity-60"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{submitting ? "Submitting..." : "Request Permission"}</span>
      </button>
    </form>
  );
}

export default PermissionRequestForm;

