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
  FileText,
  Zap,
  CornerUpRight,
  QrCode,
} from "lucide-react";
import { PassQrModal } from "@/components/student/PassQrModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { levelsAbove, requiresStepup, L4_ROLE, L1_ROLE, L2_ROLE, L3_ROLE } from "@/lib/permission-workflow-pure";
import { HostelForwardModal } from "./HostelForwardModal";
import { DirectGenerateModal } from "./DirectGenerateModal";
import type { PermissionItem } from "./PermissionRow";
import { DocumentUploadPanel } from "@/components/student/DocumentUploadPanel";
import { DigitalSignPanel } from "@/components/approver/DigitalSignPanel";

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
  lab_incharge: "Lab In-charge",
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
  const api = useApi();

  const [data, setData] = useState<PermissionItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<
    "APPROVE" | "REJECT" | "FORWARD" | "ESCALATE" | null
  >(null);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  const currentUser = useAuthStore((s) => s.user);
  const currentRole = currentUser?.role;

  const [forwardOpen, setForwardOpen] = useState(false);
  const [directGenOpen, setDirectGenOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  // Room-assignment fields for the day_scholar home_out approval flow.
  const [pendingHostelBlock, setPendingHostelBlock] = useState("");
  const [pendingRoomNumber, setPendingRoomNumber] = useState("");
  const [pendingWardenId, setPendingWardenId] = useState("");
  const [roomFieldError, setRoomFieldError] = useState<string | null>(null);

  // The student is a day_scholar when their live entry type says so. A
  // student who already has an assigned hostel_block/room_number is a
  // hosteller (not a day scholar), so the room-field gate does not apply.
  const studentEntryType =
    data?.student?.student_details?.current_entry_type ??
    data?.student?.student_details?.currentEntryType ??
    null;
  const studentIsDayScholar =
    studentEntryType === "day_scholar" &&
    !data?.student?.student_details?.hostel_block &&
    !data?.student?.student_details?.room_number;
  // A day_scholar home_out ticket (the room fields are required to approve it).
  const isDayScholarHomeOut =
    data?.workflow_type === "hostel" &&
    data?.reason === "home_out" &&
    studentIsDayScholar;

  // L1..L3 approvers can forward; principal/L4 and anyone above the chain top
  // cannot (levelsAbove is empty for L4). The Forward button is shown only
  // when the caller is in that band AND there is a strictly-higher level.
  const canForward =
    !!currentRole &&
    [L1_ROLE, L2_ROLE, L3_ROLE].includes(currentRole) &&
    levelsAbove(currentRole).length > 0;

  // G26: L4 (principal) cannot escalate — there is no level above them.
  // Hide the button so the operator is not confused by a 400 on click.
  const canEscalate = !!currentRole && levelsAbove(currentRole).length > 0;

  // L2+ (deputy_warden, hostel_manager, principal) plus sysadmin/admin may
  // direct-generate. The server re-checks the same DIRECT_GENERATE_ROLES list.
  const canDirectGenerate =
    !!currentRole &&
    [L2_ROLE, L3_ROLE, L4_ROLE, "sysadmin", "admin"].includes(currentRole);

  // Exam/memo requests carry an uploaded document + digital signature (Step 7).
  const isExamMemo = data?.workflow_type === "exam" || data?.workflow_type === "memo";

  const fetchDetail = useCallback(async () => {
    if (!ticket) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/permissions/${encodeURIComponent(ticket)}`, {
        headers: api.getHeaders(),
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
      headers: api.getHeaders(),
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

    // Day-scholar home_out approval requires all three room-assignment fields.
    if (action === "APPROVE" && isDayScholarHomeOut) {
      if (!pendingHostelBlock.trim() || !pendingRoomNumber.trim() || !pendingWardenId.trim()) {
        setRoomFieldError("All three room fields are required for day scholar home-out approval");
        return;
      }
      setRoomFieldError(null);
    }

    setActionLoading(true);
    setRoomFieldError(null);
    try {
      const body: Record<string, unknown> = {
        action,
        comment: comment.trim() || undefined,
      };
      if (action === "APPROVE" && isDayScholarHomeOut) {
        body.pendingHostelBlock = pendingHostelBlock.trim();
        body.pendingRoomNumber = pendingRoomNumber.trim();
        body.pendingWardenId = pendingWardenId.trim();
      }
      const res = await fetch(`/api/permissions/${encodeURIComponent(ticket)}`, {
        method: "PATCH",
        headers: api.getHeaders(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        addToast({
          message: `Action ${action} processed successfully`,
          variant: action === "REJECT" ? "info" : "success",
        });
        setActiveAction(null);
        setComment("");
        setPendingHostelBlock("");
        setPendingRoomNumber("");
        setPendingWardenId("");
        await fetchDetail();
        if (onActionComplete) onActionComplete();
      } else {
        // Surface the room-field requirement inline when the server rejects
        // a missing room assignment (HOSTEL_ROOM_REQUIRED).
        if (json.error?.code === "HOSTEL_ROOM_REQUIRED") {
          setRoomFieldError("All three room fields are required for day scholar home-out approval");
        }
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
          {data.status === "APPROVED" && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <QrCode className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-300">Approved Pass Credential Ready</p>
                  <p className="text-[11px] text-emerald-400/80">Scan this pass credential at campus gates.</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setQrOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0"
              >
                <QrCode className="w-3.5 h-3.5 mr-1.5" />
                Show Pass QR
              </Button>
            </div>
          )}
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

                  {/* Room-assignment fields: required to approve a day_scholar home_out ticket */}
                  {activeAction === "APPROVE" && isDayScholarHomeOut && (
                    <div className="space-y-2 p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                      <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                        Hostel Room Assignment
                        <span className="ml-1 text-[var(--action-danger)]">* required</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                            Hostel Block
                          </label>
                          <Input
                            value={pendingHostelBlock}
                            onChange={(e) => setPendingHostelBlock(e.target.value)}
                            placeholder="e.g. A"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                            Room Number
                          </label>
                          <Input
                            value={pendingRoomNumber}
                            onChange={(e) => setPendingRoomNumber(e.target.value)}
                            placeholder="e.g. 12"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                            Warden ID
                          </label>
                          <Input
                            value={pendingWardenId}
                            onChange={(e) => setPendingWardenId(e.target.value)}
                            placeholder="Warden user id"
                          />
                        </div>
                      </div>
                      {roomFieldError && (
                        <p className="text-xs text-[var(--action-danger)]">{roomFieldError}</p>
                      )}
                    </div>
                  )}

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
                    disabled={!canEscalate}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    Escalate
                  </Button>

                  {canForward && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setForwardOpen(true)}
                    >
                      <CornerUpRight className="w-3.5 h-3.5 mr-1" />
                      Forward
                    </Button>
                  )}

                  {canDirectGenerate && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDirectGenOpen(true)}
                    >
                      <Zap className="w-3.5 h-3.5 mr-1" />
                      Generate Pass
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {isExamMemo && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Document
              </h3>
              <DocumentUploadPanel
                ticketNumber={data.ticket_number}
                workflowType={data.workflow_type === "memo" ? "memo" : "exam"}
                currentStage={data.current_stage}
                status={data.status}
                documentUrl={data.document_url}
                onUploaded={fetchDetail}
              />
            </div>
          )}

          {isExamMemo && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5" />
                Digital Signature
              </h3>
              <DigitalSignPanel
                ticketNumber={data.ticket_number}
                workflowType={data.workflow_type === "memo" ? "memo" : "exam"}
                currentStage={data.current_stage}
                status={data.status}
                documentUrl={data.document_url}
                digitalSignature={data.digital_signature}
                onSigned={fetchDetail}
              />
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
                      {log.action === "FORWARDED" && (
                        <CornerUpRight className="w-3.5 h-3.5 text-amber-500" aria-label="Forwarded" />
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                          log.action === "FORWARDED"
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            : "bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--action-primary)]"
                        }`}
                      >
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

          {forwardOpen && ticket && (
            <HostelForwardModal
              isOpen={forwardOpen}
              onClose={() => setForwardOpen(false)}
              ticket={ticket}
              actorRole={currentRole || ""}
              onForwarded={fetchDetail}
            />
          )}

          {directGenOpen && (
            <DirectGenerateModal
              isOpen={directGenOpen}
              onClose={() => setDirectGenOpen(false)}
              actorRole={currentRole || ""}
              onGenerated={onActionComplete}
              defaultStudentUserId={data?.student_user_id}
              defaultStudentName={data?.student?.name}
              defaultStudentEntryType={studentEntryType}
              ticketNumber={ticket}
            />
          )}

          {qrOpen && ticket && (
            <PassQrModal
              isOpen={qrOpen}
              ticketNumber={ticket}
              passTitle={`${data.workflow_type || "Gate"} Pass`}
              fromDate={data.from_date ?? data.fromDate ?? undefined}
              toDate={data.to_date ?? data.toDate ?? undefined}
              onClose={() => setQrOpen(false)}
            />
          )}
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
