"use client";
// src/components/shared/UniversalSupportForm.tsx
// SCAFFOLD:SUPPORT — support-ticket form usable by ANY authenticated role.
//
// Why this exists: the old support surface was only reachable from a
// sysadmin-only page, so approvers (oie, hod, hostel_manager, …) had no way
// to file a ticket — the form silently did nothing for them. This component
// works from any role and cannot fail silently:
//   • same bearer + session headers every other client call uses
//   • reads the repo envelope { success:false, error:{code,message} }
//   • maps known codes to friendly text via friendlyApiError
//   • every failure renders an inline alert (never a silent no-op)
//
// Endpoint: /api/support/tickets (already role-gated for every non-privileged
// role; validateCsrf runs inside withAuthorization via assertCsrf-free GET/POST
// — POST goes through withAuthorization which validates Origin/Sec-Fetch-Site).

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { friendlyApiError, readApiError } from "@/lib/apiErrors";

export interface UniversalSupportFormProps {
  onCreated?: () => void;
  endpoint?: string;
}

const CATEGORIES = [
  { value: "system_issue", label: "System issue" },
  { value: "feature_request", label: "Feature request" },
  { value: "data_correction", label: "Data correction" },
  { value: "other", label: "Other" },
] as const;

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export function UniversalSupportForm({
  onCreated,
  endpoint = "/api/support/tickets",
}: UniversalSupportFormProps) {
  const api = useApi();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("system_issue");
  const [priority, setPriority] = useState<string>("medium");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    if (!trimmedSubject || !trimmedDescription) {
      setMsg({ kind: "err", text: "Subject and description are required." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: api.getHeaders(),
        body: JSON.stringify({
          subject: trimmedSubject,
          description: trimmedDescription,
          category,
          priority,
        }),
      });

      if (!res.ok) {
        const { code, message } = await readApiError(res);
        setMsg({ kind: "err", text: friendlyApiError(code, message) });
        return;
      }

      const body = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: { code?: string; message?: string } }
        | null;
      if (body && body.success === false) {
        setMsg({
          kind: "err",
          text: friendlyApiError(body.error?.code, body.error?.message),
        });
        return;
      }

      setMsg({ kind: "ok", text: "Support ticket created." });
      setSubject("");
      setDescription("");
      onCreated?.();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Network error" });
    } finally {
      setBusy(false);
    }
  };

  const selectClass =
    "rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]";
  const inputClass =
    "w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]";

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
    >
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">Create Support Request</h2>

      <label className="sr-only" htmlFor="support-subject">
        Subject
      </label>
      <input
        id="support-subject"
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        maxLength={200}
        required
        className={inputClass}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="sr-only" htmlFor="support-category">
          Category
        </label>
        <select
          id="support-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={selectClass}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="support-priority">
          Priority
        </label>
        <select
          id="support-priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className={selectClass}
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <label className="sr-only" htmlFor="support-description">
        Description
      </label>
      <textarea
        id="support-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe the issue in detail…"
        rows={4}
        maxLength={5000}
        required
        className={inputClass}
      />

      {msg && (
        <div
          role="status"
          aria-live="polite"
          className={
            msg.kind === "ok"
              ? "rounded-md border border-[var(--action-primary)]/40 bg-[var(--action-primary)]/10 p-2 text-xs text-[var(--action-primary)]"
              : "rounded-md border border-[var(--action-danger)]/40 bg-[var(--action-danger)]/10 p-2 text-xs text-[var(--action-danger)]"
          }
        >
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex items-center gap-2 rounded-md bg-[var(--action-primary)] px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Send className="h-4 w-4" aria-hidden />
        )}
        Submit
      </button>
    </form>
  );
}

export default UniversalSupportForm;
