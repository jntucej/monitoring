"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  X,
  User,
  Shield,
  Clock,
  ExternalLink,
  CheckCircle,
  XCircle,
  Forward,
  AlertTriangle,
  Fingerprint,
  PenTool,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import type { PermissionItem } from "./PermissionRow";

export interface PermissionDetailPanelProps {
  ticket: string | null;
  onClose: () => void;
  onActionComplete?: () => void;
  isStandalonePage?: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  caretaker: "Caretaker",
  deputy_warden: "Deputy Warden",
  hostel_manager: "Hostel Manager",
  warden_or_principal: "Warden / Principal",
  main_gate: "Main Gate",
  hod: "HOD",
  oie: "Officer in Exam (OIE)",
  vice_principal: "Vice Principal",
  principal: "Principal",
};

export function PermissionDetailPanel({
  ticket,
  onClose,
  onActionComplete,
  isStandalonePage = false,
}: PermissionDetailPanelProps) {
  const [data, setData] = useState<PermissionItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<
    "APPROVE" | "REJECT" | "FORWARD" | "ESCALATE" | null
  >(null);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const fetchDetail = useCallback(async () => {
    if (!ticket) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/permissions/${encodeURIComponent(ticket)}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error?.message || "Failed to load permission details");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [ticket]);

  useEffect(() => {
    if (!ticket) return;
    let ignore = false;

    fetch(`/api/permissions/${encodeURIComponent(ticket)}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) {
          if (json.success && json.data) {
            setData(json.data);
          } else {
            setError(json.error?.message || "Failed to load permission details");
          }
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Network error");
        }
      });

    return () => {
      ignore = true;
    };
  }, [ticket]);

  const handleAction = async (action: "APPROVE" | "REJECT" | "FORWARD" | "ESCALATE") => {
    if (!ticket) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/permissions/${encodeURIComponent(ticket)}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, comment: comment.trim() || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        addToast({
          message: `Action ${action} processed successfully`,
          variant: action === "REJECT" ? "info" : "success",
        });
        setActiveAction(null);
        setComment("");
        await fetchDetail();
        if (onActionComplete) onActionComplete();
      } else {
        addToast({
          message: json.error?.message || `Failed to process ${action}`,
          variant: "error",
        });
      }
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : "Action failed",
        variant: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (!ticket) return null;

  const content = (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          {isStandalonePage && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-[var(--action-primary)]">
                {ticket}
              </span>
              {data && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    data.status === "PENDING"
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      : data.status === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : data.status === "REJECTED"
                      ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                      : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                  }`}
                >
                  {data.status}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Workflow: <span className="font-semibold">{data?.workflow_type || "—"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={fetchDetail}
            loading={loading}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {!isStandalonePage && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center p-12 text-sm text-[var(--text-muted)]">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading request details...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Student Profile
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[var(--text-muted)] block">Name</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {data.student?.name || "—"}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block">Roll Number</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  {data.student?.student_details?.roll || "—"}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block">Year & Section</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {data.student?.student_details?.year
                    ? `Year ${data.student.student_details.year} (${data.student.student_details.section || "—"})`
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block">Hostel Block / Room</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {data.student?.student_details?.hostel_block
                    ? `${data.student.student_details.hostel_block} - Room ${data.student.student_details.room_number || "—"}`
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block">Contact Email</span>
                <span className="font-mono text-[var(--text-primary)] truncate block">
                  {data.student?.email || "—"}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block">Current Stage</span>
                <span className="font-medium text-[var(--action-primary)]">
                  {STAGE_LABELS[data.current_stage] || data.current_stage}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Verification Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <Fingerprint className="w-4 h-4 text-[var(--action-primary)]" />
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">
                    Hostel Biometric Check
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {data.biometric_hostel_at
                      ? formatDateTime(data.biometric_hostel_at)
                      : "Pending scan"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <Fingerprint className="w-4 h-4 text-[var(--action-primary)]" />
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">
                    Main Gate Biometric Check
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {data.biometric_gate_at
                      ? formatDateTime(data.biometric_gate_at)
                      : "Pending scan"}
                  </span>
                </div>
              </div>

              {data.document_required && (
                <div className="col-span-full p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">
                        Attached Document / Proof
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {data.document_url ? "Document provided" : "Missing document"}
                      </span>
                    </div>
                  </div>
                  {data.document_url && (
                    <a
                      href={data.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[var(--action-primary)] hover:underline font-medium"
                    >
                      View Document
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {data.status === "PENDING" && (
            <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] space-y-4">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Workflow Decisions
              </h3>

              {activeAction ? (
                <div className="space-y-3 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[var(--text-primary)]">
                      Execute {activeAction}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveAction(null)}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Cancel
                    </button>
                  </div>

                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Enter remarks/reason for this decision..."
                    rows={2}
                    className="w-full text-xs p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setActiveAction(null)}
                      disabled={actionLoading}
                    >
                      Back
                    </Button>
                    <Button
                      size="sm"
                      variant={activeAction === "REJECT" ? "danger" : "primary"}
                      onClick={() => handleAction(activeAction)}
                      loading={actionLoading}
                      disabled={actionLoading}
                    >
                      Confirm {activeAction}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setActiveAction("APPROVE")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setActiveAction("REJECT")}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setActiveAction("FORWARD")}
                  >
                    <Forward className="w-3.5 h-3.5 mr-1" />
                    Forward Stage
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setActiveAction("ESCALATE")}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    Escalate
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Stage History & Audit Log
            </h3>

            {(!data.stage_history || data.stage_history.length === 0) ? (
              <p className="text-xs text-[var(--text-muted)] italic">No stage history recorded.</p>
            ) : (
              <div className="space-y-2 border-l-2 border-[var(--border)] ml-2 pl-4">
                {data.stage_history.map((log, index) => (
                  <div key={index} className="space-y-1 relative group">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--action-primary)] ring-4 ring-[var(--bg-surface)]" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[var(--text-primary)]">
                        {log.actorName || "System Actor"}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        ({log.actorRole || "System"})
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] font-semibold text-[var(--action-primary)] uppercase">
                        {log.action}
                      </span>
                    </div>
                    {log.comment && (
                      <p className="text-xs text-[var(--text-secondary)] italic">
                        &ldquo;{log.comment}&rdquo;
                      </p>
                    )}
                    <span className="text-[10px] text-[var(--text-muted)] block">
                      {formatDateTime(log.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (isStandalonePage) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
        {content}
      </div>
    </div>
  );
}
