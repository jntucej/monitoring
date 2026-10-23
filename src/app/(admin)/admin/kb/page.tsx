"use client";

import { useCallback, useState } from "react";
import {
  BookOpen, Loader2, Plus,
} from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface IngestResult {
  documentId: string;
  chunkCount: number;
  deduped: boolean;
}

/**
 * Admin Knowledge Base — ingest a policy / SOP document into the RAG KB.
 * Backend: POST /api/admin/kb/documents (admin|sysadmin scope, CSRF).
 */
function AdminKbInner() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", source: "", content: "", role: "all" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const roles = draft.role === "all" ? ["all"] : [draft.role];
      const res = await fetch("/api/admin/kb/documents", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          source: draft.source,
          content: draft.content,
          roles,
        }),
      });
      const body = await res.json();
      if (!res.ok || body?.success === false) {
        setError(body?.error?.message ?? "Ingest failed");
      } else {
        const p = body?.data ?? body;
        setResult({
          documentId: p.documentId,
          chunkCount: p.chunkCount ?? 0,
          deduped: p.deduped ?? false,
        });
        setDraft({ title: "", source: "", content: "", role: "all" });
      }
    } catch (e) {
      console.error("kb ingest", e);
      setError("Failed to reach the knowledge-base service.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Knowledge Base"
        subtitle="Ingest policy and SOP documents into the on-campus RAG knowledge base"
      />

      <WidgetBoundary title="Ingest document">
        <form onSubmit={submit}>
          <SectionCard
            title="Ingest a document"
            description="Documents are chunked, embedded, and searchable via the campus RAG. Deduped by source + content hash."
            icon={BookOpen}
            iconTone="accent"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Title</span>
                  <input
                    required
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="e.g. Gate Security SOP"
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]"
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Source (dedupe key)</span>
                  <input
                    required
                    value={draft.source}
                    onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
                    placeholder="e.g. policy/gate-security"
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]"
                  />
                </label>
              </div>
              <label>
                <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Content</span>
                <textarea
                  required
                  rows={6}
                  value={draft.content}
                  onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                  placeholder="Paste the policy / SOP text…"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)] resize-y"
                />
              </label>
              <label>
                <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Audience role</span>
                <select
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]"
                >
                  <option value="all">All roles</option>
                  <option value="operator">Operator</option>
                  <option value="warden">Warden</option>
                  <option value="faculty">Faculty</option>
                  <option value="student">Student</option>
                </select>
              </label>

              {result && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300 flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>
                    Ingested {result.chunkCount} chunk{result.chunkCount === 1 ? "" : "s"}
                    {result.deduped ? " (deduped)" : ""} — document {result.documentId.slice(0, 8)}…
                  </span>
                </div>
              )}
              {error && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 flex items-center gap-2.5">
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busy || !draft.title || !draft.source || !draft.content}
                  className="px-4 py-2.5 rounded-xl bg-[var(--action-primary)] hover:opacity-90 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Ingest Document
                </button>
              </div>
            </div>
          </SectionCard>
        </form>
      </WidgetBoundary>
    </div>
  );
}

export default function AdminKbPage() {
  return (
    
      <AdminKbInner />
    
    

  );
}
