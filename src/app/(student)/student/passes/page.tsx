"use client";

/* S8: /student/passes — thin orchestrator.
   Pass list + status rendering lives here; the apply form is extracted
   to PassCreateForm so this file stays a 120-line container. */

import { useCallback, useEffect, useState } from "react";
import { QrCode, Plus, CheckCircle2, Clock, XCircle, ArrowLeft, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { useUIStore } from "@/stores/uiStore";
import { usePassTypes, getPassTypeName } from "@/hooks/usePassTypes";
import { useApi } from "@/hooks/useApi";
import { useAuthStore } from "@/stores/authStore";
import { PassQrModal } from "@/components/student/PassQrModal";
import { PassCreateForm } from "@/components/student/PassCreateForm";

export default function StudentPassesPage() {
  const api = useApi();
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedQrPass, setSelectedQrPass] = useState<{
    ticket: string;
    title: string;
    from?: string;
    to?: string;
  } | null>(null);

  const getStudentRoll = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    const auth = useAuthStore.getState();
    return auth?.user?.uniqueId ?? null;
  }, []);

  const loadPasses = useCallback(async () => {
    try {
      setLoading(true);
      const roll = getStudentRoll();
      if (!roll) {
        setPasses([]);
        return;
      }
      const res = await fetch(`/api/passes?roll=${encodeURIComponent(roll)}`, {
        headers: api.getHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPasses(json.data);
      } else {
        setPasses([]);
      }
    } catch {
      setPasses([]);
    } finally {
      setLoading(false);
    }
  }, [api, getStudentRoll]);

  useEffect(() => {
    loadPasses();
  }, [loadPasses]);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "APPROVED":
      case "COMPLETED":
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
          text: "Approved",
        };
      case "REJECTED":
        return {
          icon: <XCircle className="w-5 h-5 text-rose-400" />,
          bg: "bg-rose-500/10 border-rose-500/20 text-rose-300",
          text: "Rejected",
        };
      case "PENDING":
      default:
        return {
          icon: <Clock className="w-5 h-5 text-amber-400" />,
          bg: "bg-amber-500/10 border-amber-500/20 text-amber-300",
          text: "Pending Approval",
        };
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 pb-12 select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/student" className="min-h-[44px] inline-flex items-center justify-center p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors" aria-label="Back to student hub">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <p className="text-xs text-[var(--text-muted)]">Digital Gate Passes</p>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Apply, track and show QR passes at campus security gates
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--action-primary)] text-white font-bold text-xs shadow-md hover:opacity-95 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Apply Gate Pass</span>
        </button>
      </div>

      <div className="p-3.5 rounded-xl bg-[var(--action-info)]/10 border border-[var(--action-info)]/20 text-xs text-[var(--action-info)] flex items-center gap-2">
        <Sparkles className="w-4 h-4 shrink-0 text-[var(--action-info)]" />
        <span>
          <strong>Daily Outing:</strong> Standard local outings do not require a gate pass. Apply for a pass only when requesting <strong>Day Pass</strong> or <strong>Home Out</strong> leave.
        </span>
      </div>

      {/* Pass list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[var(--action-primary)] animate-spin" />
        </div>
      ) : passes.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-12 text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">No passes found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            You haven&apos;t requested any gate passes yet. Tap "Apply Gate Pass" to create one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {passes.map((pass) => {
            const statusStyle = getStatusDisplay(pass.finalStatus || pass.status);
            const passTitle = getPassTypeName(pass.reason);
            return (
              <div
                key={pass.id}
                className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20">
                      <QrCode className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">{passTitle}</h3>
                      <p className="text-[10px] font-mono text-[var(--text-muted)]">{pass.id}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${statusStyle.bg}`}>
                    {statusStyle.icon}
                    {statusStyle.text}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] font-semibold">Valid Period: </span>
                    <span className="font-medium text-[var(--text-secondary)]">
                      {new Date(pass.from).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} to{" "}
                      {new Date(pass.to).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  {pass.description && (
                    <div>
                      <span className="text-[var(--text-muted)] font-semibold">Details: </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {pass.description}
                      </span>
                    </div>
                  )}
                </div>

                {(pass.status === "ACTIVE" || pass.finalStatus === "APPROVED") && (
                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Ready to scan at campus gates
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedQrPass({
                          ticket: pass.ticket_number || pass.id,
                          title: passTitle,
                          from: pass.from,
                          to: pass.to,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-[var(--action-primary)] text-white text-xs font-bold hover:opacity-95 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Show QR Pass</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QR modal */}
      {selectedQrPass && (
        <PassQrModal
          isOpen={Boolean(selectedQrPass)}
          ticketNumber={selectedQrPass.ticket}
          passTitle={selectedQrPass.title}
          fromDate={selectedQrPass.from}
          toDate={selectedQrPass.to}
          onClose={() => setSelectedQrPass(null)}
        />
      )}

      {/* S8: extracted apply form */}
      <PassCreateForm
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={() => loadPasses()}
      />
    </div>
  );
}
