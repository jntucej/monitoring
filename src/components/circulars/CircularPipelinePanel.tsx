"use client";

import { useCallback, useEffect, useState } from "react";

interface PreviewData {
  fields: {
    title: string;
    circular_no: string | null;
    issued_by: string | null;
    effective_date: string | null;
    deadline: string | null;
    summary: string;
    action_required: boolean;
  };
  targets: {
    roles: string[];
    personas: string[];
    departments: string[];
    hostel_blocks: string[];
    confidence: number;
    rationale: string[];
    estimated_headcount: number;
  };
}

interface CircularRow {
  id: string;
  title: string;
  circular_no: string | null;
  deadline: string | null;
  status: string;
  requested_by_role: string;
  requester_name: string | null;
  share_token: string | null;
  classified_targets: { estimated_headcount?: number; roles?: string[]; departments?: string[] };
}

interface ComplianceData {
  circular_id: string;
  title: string;
  delivered: number;
  viewed: number;
  noted: number;
}

export function CircularPipelinePanel({ canApprove = false }: { canApprove?: boolean }) {
  const [rawText, setRawText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [circulars, setCirculars] = useState<CircularRow[]>([]);
  const [compliance, setCompliance] = useState<Record<string, ComplianceData>>({});

  const load = useCallback(() => {
    fetch("/api/circulars")
      .then((r) => r.json())
      .then((j) => {
        const list: CircularRow[] = j?.data?.circulars ?? [];
        setCirculars(list);
        for (const c of list.filter((x) => x.status === "published").slice(0, 5)) {
          fetch(`/api/circulars/${c.id}/compliance`)
            .then((res) => res.json())
            .then((cj) => {
              if (cj?.data) setCompliance((prev) => ({ ...prev, [c.id]: cj.data }));
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runOcrClassify(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) return;
    const r = await fetch("/api/circulars/ocr-classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_text: rawText, attachment_url: attachmentUrl || null }),
    });
    const j = await r.json();
    if (j?.data) {
      setPreview(j.data);
      setTitle(j.data.fields.title);
      setDeadline(j.data.fields.deadline ?? "");
      setRoles(j.data.targets.roles ?? []);
      setDepartments(j.data.targets.departments ?? []);
    }
  }

  async function submitForApproval() {
    if (!preview) return;
    await fetch("/api/circulars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || preview.fields.title,
        circular_no: preview.fields.circular_no,
        issued_by: preview.fields.issued_by,
        effective_date: preview.fields.effective_date,
        deadline: deadline || null,
        summary: preview.fields.summary,
        raw_ocr_text: rawText,
        attachment_url: attachmentUrl || null,
        action_required: preview.fields.action_required,
        classified_targets: { ...preview.targets, roles, departments },
      }),
    });
    setPreview(null);
    setRawText("");
    load();
  }

  async function decide(id: string, action: "approve" | "reject") {
    await fetch(`/api/circulars/${id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  }

  function toggleItem(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={runOcrClassify} className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          1. Scan / Paste Circular Text (OCR & Target Classification)
        </h2>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste OCR text from circular scan/PDF (e.g. Circular No: JNTUH/2026/14 — Mandatory for 3rd Year CSE & IT hostellers. Deadline: 2026-11-28)"
          className="w-full border-b border-border py-2 text-sm text-foreground"
          rows={4}
          required
        />
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="Optional PDF / scan URL"
            className="flex-1 border-b border-border py-1.5 text-xs text-foreground"
          />
          <button type="submit" className="bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
            Run OCR & Classify
          </button>
        </div>
      </form>

      {preview && (
        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-semibold text-foreground">
            2. Review Extracted Values & Classified Audience (~{preview.targets.estimated_headcount} recipients,{" "}
            {Math.round(preview.targets.confidence * 100)}% confidence)
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-b border-border py-1 text-sm text-foreground"
            />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="border-b border-border py-1 text-sm text-foreground"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {["student", "faculty", "hod", "guardian", "staff", "worker"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => toggleItem(roles, setRoles, r)}
                className={`px-2 py-1 ${
                  roles.includes(r) ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
            {["CSE", "IT", "ECE", "EEE", "MECH"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleItem(departments, setDepartments, d)}
                className={`px-2 py-1 ${
                  departments.includes(d) ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Rationale: {preview.targets.rationale.join(" • ")}
          </div>
          <button
            type="button"
            onClick={submitForApproval}
            className="bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Submit for Principal Approval
          </button>
        </div>
      )}

      <div className="space-y-2 pt-4">
        <h2 className="text-sm font-semibold text-foreground">
          3. Approval Queue & Noted Compliance ({circulars.length})
        </h2>
        <div className="divide-y divide-border">
          {circulars.map((c) => {
            const comp = compliance[c.id];
            return (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm text-foreground">
                <div>
                  <strong>{c.title}</strong> ({c.status})
                  <div className="text-xs text-muted-foreground">
                    By {c.requester_name ?? c.requested_by_role} • Est. {c.classified_targets?.estimated_headcount ?? 0}
                    {comp ? ` • Delivered: ${comp.delivered}, Viewed: ${comp.viewed}, Noted: ${comp.noted}` : ""}
                  </div>
                </div>
                {canApprove && (c.status === "pending_principal" || c.status === "pending_vp") && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => decide(c.id, "approve")}
                      className="bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                    >
                      Approve & Publish
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(c.id, "reject")}
                      className="border border-border px-3 py-1 text-xs text-destructive"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
