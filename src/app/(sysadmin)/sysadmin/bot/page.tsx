"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useApi } from "@/hooks/useApi";
import { useUIStore } from "@/stores/uiStore";
import {
  Bot,
  Users,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  KeyRound,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";

interface TelegramStudent {
  id: string;
  uniqueId: string;
  name: string;
  email: string;
  phone: string | null;
  telegramChatId: string | null;
  telegramUserId: string | null;
  telegramVerifiedAt: string | null;
  telegramLastSeenAt: string | null;
  isLinked: boolean;
  isVerified: boolean;
}

interface BotSummary {
  total: number;
  linked: number;
  verified: number;
  unverified: number;
}

export default function SysadminBotPage() {
  const api = useApi();
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generatingLinks, setGeneratingLinks] = useState(false);
  const [summary, setSummary] = useState<BotSummary>({
    total: 0,
    linked: 0,
    verified: 0,
    unverified: 0,
  });
  const [students, setStudents] = useState<TelegramStudent[]>([]);
  const [search, setSearch] = useState("");
  const [verifyingRoll, setVerifyingRoll] = useState<string | null>(null);
  const [verifyModalRoll, setVerifyModalRoll] = useState<string | null>(null);
  const [verifyInputCode, setVerifyInputCode] = useState("");
  const [verifyActionLoading, setVerifyActionLoading] = useState(false);
  const [generatedCodeResult, setGeneratedCodeResult] = useState<{
    roll: string;
    code?: string;
    sentViaTelegram?: boolean;
    expiresAt?: string;
  } | null>(null);

  // Fetch bot statistics and student list
  const fetchData = useCallback(
    async (query = "") => {
      try {
        setLoading(true);
        const url = `/api/bot/telegram-sync${query ? `?search=${encodeURIComponent(query)}` : ""}`;
        const res = await api.request<{
          summary: BotSummary;
          students: TelegramStudent[];
        }>(url);

        if (res.success && res.data) {
          setSummary(res.data.summary);
          setStudents(res.data.students || []);
        } else {
          addToast({
            variant: "error",
            message: res.error || res.message || "Failed to load Telegram bot data",
          });
        }
      } catch (err: any) {
        addToast({
          variant: "error",
          message: err?.message || "Error connecting to bot API",
        });
      } finally {
        setLoading(false);
      }
    },
    [api, addToast]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Action: Sync Emails to Telegram
  const handleSyncEmails = async () => {
    try {
      setSyncing(true);
      const res = await api.request<{
        totalStudents: number;
        syncedCount: number;
        linkedByPhoneCount: number;
      }>("/api/bot/telegram-sync", {
        method: "POST",
        body: JSON.stringify({ action: "sync" }),
      });

      if (res.success && res.data) {
        addToast({
          variant: "success",
          message: `Synced ${res.data.syncedCount} student profiles to Telegram Bot DB!`,
        });
        void fetchData(search);
      } else {
        addToast({
          variant: "error",
          message: res.error || res.message || "Sync failed",
        });
      }
    } catch (err: any) {
      addToast({ variant: "error", message: err?.message || "Failed to trigger sync" });
    } finally {
      setSyncing(false);
    }
  };

  // Action: Generate Batch Links
  const handleGenerateBatchLinks = async () => {
    try {
      setGeneratingLinks(true);
      const res = await api.request<{
        createdCount: number;
        totalEligible: number;
      }>("/api/bot/telegram-sync", {
        method: "POST",
        body: JSON.stringify({ action: "generate-links" }),
      });

      if (res.success && res.data) {
        addToast({
          variant: "success",
          message: `Generated ${res.data.createdCount} new telegram deep links!`,
        });
        void fetchData(search);
      } else {
        addToast({
          variant: "error",
          message: res.error || res.message || "Link generation failed",
        });
      }
    } catch (err: any) {
      addToast({
        variant: "error",
        message: err?.message || "Failed to generate batch links",
      });
    } finally {
      setGeneratingLinks(false);
    }
  };

  // Trigger verification code generation for a student
  const handleRequestCode = async (roll: string) => {
    try {
      setVerifyingRoll(roll);
      const res = await api.request<{
        studentUniqueId: string;
        name: string;
        sentViaTelegram: boolean;
        code?: string;
        expiresAt: string;
      }>("/api/bot/telegram-verify", {
        method: "POST",
        body: JSON.stringify({ studentUniqueId: roll }),
      });

      if (res.success && res.data) {
        setGeneratedCodeResult({
          roll,
          code: res.data.code,
          sentViaTelegram: res.data.sentViaTelegram,
          expiresAt: res.data.expiresAt,
        });
        setVerifyModalRoll(roll);
        setVerifyInputCode(res.data.code || "");
        addToast({
          variant: "success",
          message: res.data.sentViaTelegram
            ? `Verification code dispatched to student's Telegram!`
            : `Generated 6-digit code for ${roll}`,
        });
      } else {
        addToast({
          variant: "error",
          message: res.error || res.message || "Failed to generate verification code",
        });
      }
    } catch (err: any) {
      addToast({
        variant: "error",
        message: err?.message || "Verification request error",
      });
    } finally {
      setVerifyingRoll(null);
    }
  };

  // Submit verification code to confirm
  const handleConfirmVerify = async () => {
    if (!verifyModalRoll || !verifyInputCode.trim()) return;

    try {
      setVerifyActionLoading(true);
      const res = await api.request<{
        verified: boolean;
        studentUniqueId: string;
      }>("/api/bot/telegram-sync", {
        method: "POST",
        body: JSON.stringify({
          action: "verify",
          studentUniqueId: verifyModalRoll,
          code: verifyInputCode.trim(),
        }),
      });

      if (res.success && res.data?.verified) {
        addToast({
          variant: "success",
          message: `Student ${verifyModalRoll} successfully verified!`,
        });
        setVerifyModalRoll(null);
        setVerifyInputCode("");
        setGeneratedCodeResult(null);
        void fetchData(search);
      } else {
        addToast({
          variant: "error",
          message: res.error || res.message || "Code verification failed",
        });
      }
    } catch (err: any) {
      addToast({
        variant: "error",
        message: err?.message || "Verification submit error",
      });
    } finally {
      setVerifyActionLoading(false);
    }
  };

  // Filtered search
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.uniqueId.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [students, search]);

  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <Bot className="w-4 h-4 text-[color:var(--action-primary)]" />
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Telegram Bot Assistant
                  <span className="text-xs font-medium text-[color:var(--action-primary)]">
                    @cej_server_bot
                  </span>
                </h1>
                <p className="text-sm text-text-secondary">
                  Manage student account links, automated syncs, and verification flows.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncEmails}
              disabled={syncing || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-bg-surface hover:bg-bg-elevated text-sm font-medium text-text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin text-[color:var(--action-primary)]" : ""}`} />
              {syncing ? "Syncing..." : "Sync Emails to Telegram"}
            </button>

            <button
              onClick={handleGenerateBatchLinks}
              disabled={generatingLinks || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--action-primary)] hover:bg-[color:var(--action-primary)]/80 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {generatingLinks ? "Generating..." : "Generate Batch Links"}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary">Total Students</span>
              <Users className="w-4 h-4 text-text-muted" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{summary.total.toLocaleString()}</span>
              <span className="text-xs text-text-muted">enrolled</span>
            </div>
          </div>

          <div className="bg-bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary">Linked to Telegram</span>
              <LinkIcon className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-400">{summary.linked.toLocaleString()}</span>
              <span className="text-xs text-text-muted">
                {summary.total > 0 ? `${Math.round((summary.linked / summary.total) * 100)}%` : "0%"}
              </span>
            </div>
          </div>

          <div className="bg-bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary">Verified Accounts</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400">
                {summary.verified.toLocaleString()}
              </span>
              <span className="text-xs text-text-muted">active</span>
            </div>
          </div>

          <div className="bg-bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary">Unverified</span>
              <AlertCircle className="w-4 h-4 text-[color:var(--action-primary)]" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[color:var(--action-primary)]">
                {summary.unverified.toLocaleString()}
              </span>
              <span className="text-xs text-text-muted">pending</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-bg-surface p-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Roll Number, Name, Email..."
              className="w-full bg-bg-base pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[color:var(--action-primary)] focus:ring-1 focus:ring-[color:var(--action-primary)]"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => fetchData(search)}
              disabled={loading}
              className="p-2 bg-bg-surface hover:bg-bg-elevated text-text-secondary transition-colors"
              title="Refresh student roster"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[color:var(--action-primary)]" : ""}`} />
            </button>
            <span className="text-xs text-text-muted">
              Showing {filteredStudents.length} students
            </span>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text-secondary">
              <thead className="bg-bg-base/60 text-xs uppercase tracking-wider text-text-muted font-semibold">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Student
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Telegram Status
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Chat ID
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Last Seen
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[color:var(--action-primary)] mb-2" />
                      Loading students roster...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                      No matching students found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-bg-surface/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-medium text-white">{st.uniqueId}</span>
                          <span className="text-xs text-text-muted">{st.name}</span>
                          <span className="text-xs text-text-muted">{st.email}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {st.isVerified ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        ) : st.isLinked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-400">
                            <LinkIcon className="w-3.5 h-3.5" />
                            Linked (Unverified)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-bg-surface/40 text-text-muted">
                            <XCircle className="w-3.5 h-3.5" />
                            Not Linked
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono text-xs">
                        {st.telegramChatId ? (
                          <span className="text-text-primary">{st.telegramChatId}</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-text-muted">
                        {st.telegramLastSeenAt ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-text-muted" />
                            {new Date(st.telegramLastSeenAt).toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-text-muted">Never</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRequestCode(st.uniqueId)}
                          disabled={verifyingRoll === st.uniqueId}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[color:var(--action-primary)]/10 hover:bg-[color:var(--action-primary)]/20 border border-[color:var(--action-primary)]/30 text-[color:var(--action-primary)] text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          {verifyingRoll === st.uniqueId ? "Generating..." : "Verify / Relay Code"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification Modal */}
        {verifyModalRoll && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-bg-base w-full max-w-md p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2 text-[color:var(--action-primary)]">
                  <KeyRound className="w-4 h-4" />
                  <h3 className="font-semibold text-white">Verify Telegram Link</h3>
                </div>
                <button
                  onClick={() => {
                    setVerifyModalRoll(null);
                    setGeneratedCodeResult(null);
                    setVerifyInputCode("");
                  }}
                  className="text-text-muted hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-text-secondary">
                  Target Student: <span className="font-mono font-bold text-[color:var(--action-primary)]">{verifyModalRoll}</span>
                </p>

                {generatedCodeResult?.code && (
                  <div className="p-4 bg-[color:var(--action-primary)]/10 space-y-2">
                    <span className="text-xs font-medium text-[color:var(--action-primary)] block">
                      Generated 6-Digit Verification Code:
                    </span>
                    <div className="text-2xl font-mono font-bold text-white tracking-widest bg-bg-base/60 p-2.5 text-center">
                      {generatedCodeResult.code}
                    </div>
                    <p className="text-[11px] text-text-muted">
                      {generatedCodeResult.sentViaTelegram
                        ? "Sent directly to student via Telegram bot."
                        : "Student is not linked to chat yet. Provide this code to the student to send via /verify <code> in Telegram, or submit it here directly."}
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">
                    Enter Verification Code
                  </label>
                  <input
                    type="text"
                    value={verifyInputCode}
                    onChange={(e) => setVerifyInputCode(e.target.value)}
                    placeholder="e.g. 123456"
                    maxLength={6}
                    className="w-full bg-bg-surface px-3 py-2 text-sm text-white font-mono placeholder:text-text-muted focus:outline-none focus:border-[color:var(--action-primary)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setVerifyModalRoll(null);
                    setGeneratedCodeResult(null);
                    setVerifyInputCode("");
                  }}
                  className="px-4 py-2 bg-bg-surface hover:bg-bg-elevated text-text-secondary text-xs font-medium transition-colors"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleConfirmVerify}
                  disabled={verifyActionLoading || !verifyInputCode.trim()}
                  className="px-4 py-2 bg-[color:var(--action-primary)] hover:bg-[color:var(--action-primary)]/80 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {verifyActionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Verification
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
