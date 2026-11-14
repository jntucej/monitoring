"use client";

import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, FileText, AlertCircle, Building, GraduationCap, Calendar } from "lucide-react";
import { ReasonSelect } from "@/components/shared/ReasonSelect";
import { useApi } from "@/hooks/useApi";
import type { WorkflowType } from "@/lib/types";

export interface PermissionRequestFormProps {
  onSubmitted?: (ticketNumber: string) => void;
  defaultWorkflow?: WorkflowType;
  lockedWorkflow?: boolean;
}

export function PermissionRequestForm({
  onSubmitted,
  defaultWorkflow = "hostel",
  lockedWorkflow = false,
}: PermissionRequestFormProps) {
  const [workflowType, setWorkflowType] = useState<WorkflowType>(defaultWorkflow);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [fromDatetime, setFromDatetime] = useState("");
  const [toDatetime, setToDatetime] = useState("");
  const [documentRequired, setDocumentRequired] = useState(defaultWorkflow === "exam" || defaultWorkflow === "memo");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  const { post } = useApi();
  const isExamMemo = workflowType === "exam" || workflowType === "memo";

  useEffect(() => {
    if (isExamMemo) setDocumentRequired(true);
  }, [isExamMemo]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!reason) errs.reason = "Please select a reason.";
    if (isExamMemo && !description.trim()) errs.description = "A description is required.";
    if (workflowType === "hostel" || workflowType === "staff_leave") {
      if (!fromDatetime) errs.fromDatetime = "Start date & time required.";
      if (!toDatetime) errs.toDatetime = "End date & time required.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        workflowType,
        reason,
        description: description.trim() || undefined,
        fromDatetime: fromDatetime || undefined,
        toDatetime: toDatetime || undefined,
        documentRequired: isExamMemo ? true : documentRequired,
      };
      const res = await post<{ ticket_number: string }>("/api/permissions", payload);
      if (res.success && res.data?.ticket_number) {
        setTicketNumber(res.data.ticket_number);
        if (onSubmitted) onSubmitted(res.data.ticket_number);
      } else {
        setError(res.error || "Failed to submit request.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (ticketNumber) {
    return (
      <div className="surface-card bg-bg-surface p-6 text-center space-y-4">
        <div className="size-6 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-action-success" />
        </div>
        <h2 className="text-lg font-bold text-text-primary">Request Submitted</h2>
        <p className="text-xs text-text-muted">Your ticket #{ticketNumber} is now pending approval.</p>
        <div className="surface-card p-3 bg-bg-elevated font-mono text-sm font-bold text-action-primary">
          Ticket #{ticketNumber}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card bg-bg-surface p-5 space-y-5">
      {!lockedWorkflow && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "hostel", label: "Hostel", icon: Building },
              { id: "exam", label: "Exam", icon: GraduationCap },
              { id: "memo", label: "Memo", icon: FileText },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setWorkflowType(id as WorkflowType); setReason(""); }}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  workflowType === id
                    ? "bg-action-primary/10 border-action-primary text-action-primary"
                    : "bg-bg-elevated border-border text-text-secondary hover:bg-bg-surface"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-text-secondary">Reason *</label>
        <ReasonSelect
          workflowType={workflowType}
          value={reason}
          onChange={(code) => { setReason(code); setFieldErrors((p) => ({ ...p, reason: "" })); }}
          required
        />
        {fieldErrors.reason && <p className="text-xs text-action-danger">{fieldErrors.reason}</p>}
      </div>

      {(workflowType === "hostel" || workflowType === "staff_leave") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> From *
            </label>
            <input
              type="datetime-local"
              value={fromDatetime}
              onChange={(e) => setFromDatetime(e.target.value)}
              className="surface-card w-full text-xs p-2.5 bg-bg-elevated text-text-primary"
            />
            {fieldErrors.fromDatetime && <p className="text-xs text-action-danger">{fieldErrors.fromDatetime}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> To *
            </label>
            <input
              type="datetime-local"
              value={toDatetime}
              onChange={(e) => setToDatetime(e.target.value)}
              className="surface-card w-full text-xs p-2.5 bg-bg-elevated text-text-primary"
            />
            {fieldErrors.toDatetime && <p className="text-xs text-action-danger">{fieldErrors.toDatetime}</p>}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-semibold text-text-secondary" htmlFor="description-isexammemo">Description {isExamMemo && "*"}</label>
        <textarea id="description-isexammemo"
          rows={3}
          value={description}
          onChange={(e) => { setDescription(e.target.value); setFieldErrors((p) => ({ ...p, description: "" })); }}
          placeholder="Details..."
          className="surface-card w-full text-xs p-2.5 bg-bg-elevated text-text-primary"
        />
        {fieldErrors.description && <p className="text-xs text-action-danger">{fieldErrors.description}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="doc-req-chk"
          checked={isExamMemo ? true : documentRequired}
          disabled={isExamMemo}
          onChange={(e) => setDocumentRequired(e.target.checked)}
          className="rounded border-border text-action-primary"
        />
        <label htmlFor="doc-req-chk" className="text-xs text-text-secondary cursor-pointer">
          Document Required {isExamMemo && "(Auto-checked for exam/memo)"}
        </label>
      </div>

      {error && (
        <div className="surface-card p-3 bg-rose-500/10 flex items-center gap-2 text-action-danger text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="surface-card w-full py-2.5 px-4 bg-action-primary text-white text-xs font-bold hover:brightness-110 disabled:opacity-50 transition flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit Permission Request</span>}
      </button>
    </form>
  );
}
export default PermissionRequestForm;
