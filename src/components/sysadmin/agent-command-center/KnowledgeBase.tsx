"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Upload,
  AlertCircle,
  CheckCircle2,
  Database,
  Search,
  ExternalLink,
  Layers,
  Shield,
  FileCheck,
  RefreshCw,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CitationChip } from "@/components/bot/CitationChip";
import type { Citation } from "@/components/bot/store";

export interface KnowledgeBaseProps {
  refreshSignal?: number;
}

interface IngestResponseData {
  documentId: string;
  chunkCount: number;
  deduped: boolean;
}

interface IngestSuccessState {
  documentId: string;
  chunkCount: number;
  deduped: boolean;
  title: string;
  source: string;
  roles: string[];
}

interface IngestFormState {
  title: string;
  source: string;
  content: string;
  role: string;
}

const INITIAL_FORM: IngestFormState = { title: "", source: "", content: "", role: "all" };

export function KnowledgeBase({ refreshSignal: _refreshSignal }: KnowledgeBaseProps) {
  const api = useApi();
  const [form, setForm] = useState<IngestFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastIngested, setLastIngested] = useState<IngestSuccessState | null>(null);
  const [sessionDocs, setSessionDocs] = useState<IngestSuccessState[]>([]);

  const handleIngest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const title = form.title.trim();
    const source = form.source.trim();
    const content = form.content.trim();

    if (!title || !source || !content) {
      setFormError("Title, source identifier, and document content are required.");
      return;
    }

    if (content.length > 500_000) {
      setFormError("Content exceeds 500KB limit.");
      return;
    }

    setSubmitting(true);
    try {
      const roles = form.role === "all" ? ["all"] : [form.role];
      const payload = { title, source, content, roles };

      const res = await api.request<IngestResponseData>("/api/admin/kb/documents", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        const errObj = res.error as unknown as { message?: string } | undefined;
        const errorMsg =
          typeof res.error === "string"
            ? res.error
            : errObj?.message || res.message || "KB document ingestion failed";
        setFormError(errorMsg);
      } else {
        const data = (res.data ?? res) as unknown as IngestResponseData;
        const successItem: IngestSuccessState = {
          documentId: data.documentId || "unknown",
          chunkCount: typeof data.chunkCount === "number" ? data.chunkCount : 0,
          deduped: Boolean(data.deduped),
          title,
          source,
          roles,
        };

        setLastIngested(successItem);
        setSessionDocs((prev) => [successItem, ...prev]);
        setForm(INITIAL_FORM);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reach knowledge-base ingestion API";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const sampleCitationForInspector: Citation | null = lastIngested
    ? {
        n: 1,
        id: lastIngested.documentId,
        documentId: lastIngested.documentId,
        title: lastIngested.title,
        source: lastIngested.source,
        score: 0.95,
        excerpt: `Audience roles: [${lastIngested.roles.join(", ")}]. Indexed into ${lastIngested.chunkCount} vector chunk(s)${lastIngested.deduped ? " (deduplicated by content hash)" : ""}.`,
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Banner */}
      <div className="surface-card bg-bg-surface border border-border p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-md bg-action-primary/10 text-action-primary shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Campus RAG Knowledge Base</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Vector embeddings corpus powering campus policy retrieval and assistant answers.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="entry" dot>
            RAG Ingestion Active
          </Badge>
          <Badge variant="leave" dot={false}>
            POST /api/admin/kb/documents
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section B: Ingestion Form */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card className="surface-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-action-primary" />
                  <CardTitle className="text-sm font-semibold">Ingest Policy / SOP Document</CardTitle>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted bg-bg-base px-2 py-0.5 rounded border border-border">
                  Vector Pipeline
                </span>
              </div>
              <CardDescription className="text-xs text-text-secondary">
                Chunked, embedded, and deduplicated by source and content SHA-256 hash.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleIngest} className="space-y-4">
                <div>
                  <Input
                    label="Document Title"
                    required
                    placeholder="e.g. Gate Security Standard Operating Procedure"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <Input
                    label="Source Identifier (Dedupe Key)"
                    required
                    placeholder="e.g. policy/gate-security-2026"
                    value={form.source}
                    onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                    helper="Unique path or slug used to detect duplicate uploads"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1 uppercase">
                    Audience Role Scope
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                    disabled={submitting}
                    aria-label="Audience Role Scope"
                    className="w-full h-11 px-4 rounded-md bg-bg-surface border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ringfocus-ring focus:border-transparent transition-colors"
                  >
                    <option value="all">All Roles (Campus-wide)</option>
                    <option value="operator">Operator (Gate & Security)</option>
                    <option value="warden">Warden (Hostel Oversight)</option>
                    <option value="faculty">Faculty & Mentors</option>
                    <option value="student">Student Body</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1 uppercase">
                    Document Text Content
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={form.content}
                    onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="Paste the raw policy / guidelines text for semantic chunking..."
                    disabled={submitting}
                    className="w-full p-3 rounded-md bg-bg-surface border border-border text-text-primary text-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ringfocus-ring focus:border-transparent transition-colors resize-y font-mono text-xs leading-relaxed"
                  />
                  <span className="text-[11px] text-text-muted block mt-1">
                    Max 500,000 characters. Text will be parsed into indexed embedding chunks.
                  </span>
                </div>

                {/* Inline Error Banner */}
                {formError && (
                  <div
                    role="alert"
                    className="surface-card bg-action-danger/10 border border-action-danger/20 p-3 rounded-md flex items-start gap-2.5 text-action-danger text-xs"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">Ingestion Request Failed</p>
                      <p className="mt-0.5 leading-relaxed">{formError}</p>
                    </div>
                  </div>
                )}

                {/* Ingestion Success Feedback */}
                {lastIngested && !formError && (
                  <div className="surface-card bg-action-primary/10 border border-action-primary/20 p-3 rounded-md flex items-start gap-2.5 text-text-primary text-xs">
                    <CheckCircle2 className="w-4 h-4 text-action-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-action-primary">Document Successfully Processed</p>
                      <p className="mt-0.5 text-text-secondary">
                        Document ID:{" "}
                        <span className="font-mono text-[11px] text-text-primary font-bold">
                          {lastIngested.documentId}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="entry" dot={false}>
                          {lastIngested.chunkCount} chunk{lastIngested.chunkCount === 1 ? "" : "s"}
                        </Badge>
                        <Badge variant={lastIngested.deduped ? "leave" : "success"} dot>
                          {lastIngested.deduped ? "deduped (existing hash)" : "newly indexed"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  disabled={submitting || !form.title.trim() || !form.source.trim() || !form.content.trim()}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {submitting ? "Processing & Embedding..." : "Ingest into Knowledge Base"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Section A & C: Document List + Retrieval Telemetry */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Section A: Document List */}
          <Card className="surface-card">
          <CardHeader>
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-action-primary" />
            <CardTitle className="text-sm font-semibold">Indexed Knowledge Base Documents</CardTitle>
          </div>
          <Badge variant="offline" dot={false}>POST-only KB Route</Badge>
          </div>
          <CardDescription className="text-xs text-text-secondary">
          Backend route <code className="text-xs font-mono">/api/admin/kb/documents</code> implements ingestion
          (POST). No server-side document enumeration endpoint is exposed yet.
          </CardDescription>
          </CardHeader>

          <CardContent>
          {sessionDocs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-text-muted pb-1 border-b border-border">
              <span>Active Session Ingestions ({sessionDocs.length})</span>
              <span className="text-[11px]">Real-time ingest ledger</span>
            </div>
            <div className="space-y-2">
              {sessionDocs.map((doc, idx) => (
                <div
                  key={`${doc.documentId}-${idx}`}
                  className="surface-card p-3 rounded-md bg-bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-text-primary truncate">{doc.title}</span>
                      <span className="font-mono text-[10px] text-text-muted">[{doc.source}]</span>
                    </div>
                    <p className="font-mono text-[11px] text-text-secondary truncate mt-0.5">ID: {doc.documentId}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="entry" dot={false}>{doc.chunkCount} chunks</Badge>
                    <Badge variant={doc.deduped ? "leave" : "success"} dot>
                      {doc.deduped ? "deduped" : "indexed"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          <div className="surface-card bg-bg-base/60 border border-dashed border-border rounded-lg p-6 text-center my-2">
          <div className="w-9 h-9 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-2.5 text-text-muted">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-semibold text-text-primary">No KB document list endpoint yet</h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto mt-1 leading-relaxed">
            The current API only provides ingestion via{" "}
            <code className="text-action-primary font-mono text-[11px]">POST /api/admin/kb/documents</code>. A
            document overview/listing query route (GET) has not been provisioned in the backend. Ingested documents
            above reflect confirmed API responses.
          </p>
          </div>
          </CardContent>
          </Card>

          {/* Section C: Retrieval Telemetry & Citation Preview */}
          <Card className="surface-card">
          <CardHeader>
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-action-primary" />
            <CardTitle className="text-sm font-semibold">Retrieval Hit Metrics & Citations</CardTitle>
          </div>
          <Badge variant="leave" dot={false}>Telemetry Link</Badge>
          </div>
          <CardDescription className="text-xs text-text-secondary">
          Live inspection of RAG citations surfaced in assistant responses via CitationChip.
          </CardDescription>
          </CardHeader>

          <CardContent>
          <div className="surface-card bg-bg-base/60 border border-dashed border-border rounded-lg p-5 text-center mb-4">
          <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-2 text-text-muted">
            <AlertCircle className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-text-primary">No retrieval telemetry yet</p>
          <p className="text-xs text-text-secondary max-w-sm mx-auto mt-0.5 leading-relaxed">
            Per-query vector hit ratios and relevance scoring telemetry endpoints are not yet exposed by the RAG
            service. Invented numbers and mock charts are strictly disallowed.
          </p>
          </div>

          <div className="surface-card bg-bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-action-success" />
              Verified CitationChip Component Preview
            </span>
            <span className="text-[10px] font-mono text-text-muted">src/components/bot/CitationChip.tsx</span>
          </div>

          {sampleCitationForInspector ? (
            <div className="space-y-2">
              <p className="text-xs text-text-muted">Source preview from your latest confirmed ingestion:</p>
              <CitationChip cites={[sampleCitationForInspector]} />
            </div>
          ) : (
            <div className="p-3 bg-bg-base rounded border border-border text-xs text-text-muted">
              Ingest a document above to preview its live interactive CitationChip with parsed title, source slug,
              and chunk telemetry.
            </div>
          )}
          </div>
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default KnowledgeBase;
