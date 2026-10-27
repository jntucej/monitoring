"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Upload,
  KeyRound,
  ShieldOff,
  Shield,
  Hash,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import type { User, AccountStatus, Role } from "@/lib/types";

export interface UserManagementPanelProps {
  role?: Role | string;
  status?: AccountStatus | string;
  departmentId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  initialRole?: Role | string;
}

type ModalKind = "password" | "pin" | null;

interface SuspendTarget {
  user: User;
  suspend: boolean;
}

export function UserManagementPanel(props: UserManagementPanelProps) {
  return (
    <WidgetBoundary title="User Management">
      <UserManagementPanelBody {...props} />
    </WidgetBoundary>
  );
}

function UserManagementPanelBody({
  role,
  status,
  departmentId,
  search,
  page = 1,
  pageSize = 25,
  initialRole,
}: UserManagementPanelProps) {
  const effectiveRole = role ?? initialRole;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [query, setQuery] = useState(search ?? "");

  // Row action states
  const [suspendTarget, setSuspendTarget] = useState<SuspendTarget | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalTarget, setModalTarget] = useState<User | null>(null);
  const [secretValue, setSecretValue] = useState("");
  const [secretError, setSecretError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);

  // Bulk import state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkRows, setBulkRows] = useState<Record<string, unknown>[]>([]);
  const [bulkValid, setBulkValid] = useState<Record<string, unknown>[]>([]);
  const [bulkInvalid, setBulkInvalid] = useState<Array<{ index: number; errors: string[] }>>([]);
  const [bulkSummary, setBulkSummary] = useState<{ total: number; valid: number; invalid: number } | null>(null);
  const [bulkValidating, setBulkValidating] = useState(false);
  const [bulkCommitting, setBulkCommitting] = useState(false);
  const [bulkCommitConfirm, setBulkCommitConfirm] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ imported: number; failed: number } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (departmentId) params.set("departmentId", departmentId);
      if (status) params.set("status", status);
      if (effectiveRole) params.set("role", String(effectiveRole));
      const qs = params.toString();
      const url = qs ? `/api/users?${qs}` : "/api/users";
      const res = await fetch(url, { headers: getAuthHeaders(), cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUsers(json.data);
      } else {
        const msg = typeof json.error === "string" ? json.error : json.error?.message || "Failed to load users";
        setError(msg);
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [query, departmentId, status, effectiveRole]);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, status, effectiveRole, page, pageSize]);

  const filtered = useMemo(() => {
    let list = users;
    if (effectiveRole) list = list.filter((u) => (u.role || "").toString().toLowerCase() === String(effectiveRole).toLowerCase());
    if (status) list = list.filter((u) => (u.status || "").toString().toUpperCase() === String(status).toUpperCase());
    return list;
  }, [users, effectiveRole, status]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const setStatus = useCallback(async (user: User, next: AccountStatus) => {
    setBusyRow(user.id);
    setFlash(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: next } : u)));
        setFlash({ type: "success", msg: next === "SUSPENDED" ? "User suspended" : "User reactivated" });
        loadUsers();
      } else {
        const msg = typeof json.error === "string" ? json.error : json.error?.message || "Update failed";
        setFlash({ type: "error", msg });
      }
    } catch (e: unknown) {
      setFlash({ type: "error", msg: (e as Error)?.message || "Network error" });
    } finally {
      setBusyRow(null);
    }
  }, [loadUsers]);

  const openSecretModal = useCallback((kind: "password" | "pin", user: User) => {
    setModal(kind);
    setModalTarget(user);
    setSecretValue("");
    setSecretError(null);
    setBusy(false);
  }, []);

  const closeSecretModal = useCallback(() => {
    setModal(null);
    setModalTarget(null);
    setSecretValue("");
    setSecretError(null);
    setBusy(false);
  }, []);

  const submitSecret = useCallback(async () => {
    if (!modalTarget || busy) return;
    setBusy(true);
    setSecretError(null);
    setFlash(null);
    try {
      const isPassword = modal === "password";
      if (isPassword && secretValue.length < 8) {
        setSecretError("Password must be at least 8 characters");
        setBusy(false);
        return;
      }
      if (!isPassword && !/^\d{8}$/.test(secretValue)) {
        setSecretError("PIN must be exactly 8 digits");
        setBusy(false);
        return;
      }
      const endpoint = isPassword ? "reset-password" : "reset-pin";
      const body = isPassword ? { password: secretValue } : { pin: secretValue };
      const res = await fetch(`/api/admin/users/${modalTarget.id}/${endpoint}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setFlash({ type: "success", msg: isPassword ? "Password reset" : "PIN reset" });
        closeSecretModal();
      } else {
        const msg = typeof json.error === "string" ? json.error : json.error?.message || "Reset failed";
        setSecretError(msg);
      }
    } catch (e: unknown) {
      setSecretError((e as Error)?.message || "Network error");
    } finally {
      setBusy(false);
    }
  }, [modal, modalTarget, secretValue, busy, closeSecretModal]);

  // ---- Bulk import ----
  const parseCsv = useCallback((text: string): Record<string, unknown>[] => {
    const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(",");
      const rec: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        if (h) rec[h] = (cells[idx] ?? "").trim();
      });
      rows.push(rec);
    }
    return rows;
  }, []);

  const onFileSelect = useCallback((file: File) => {
    setBulkFile(file);
    setBulkValid([]);
    setBulkInvalid([]);
    setBulkSummary(null);
    setBulkResult(null);
    setBulkError(null);
    file.text().then((text) => {
      setBulkRows(parseCsv(text));
    }).catch(() => {
      setBulkRows([]);
      setBulkError("Could not read file");
    });
  }, [parseCsv]);

  const validateBulk = useCallback(async () => {
    if (bulkRows.length === 0) {
      setBulkError("No rows to validate. Please select a CSV file.");
      return;
    }
    setBulkValidating(true);
    setBulkError(null);
    setBulkValid([]);
    setBulkInvalid([]);
    setBulkSummary(null);
    setBulkResult(null);
    try {
      const res = await fetch("/api/admin/users/bulk/validate", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ rows: bulkRows }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setBulkValid(Array.isArray(json.data.valid) ? json.data.valid : []);
        setBulkInvalid(Array.isArray(json.data.invalid) ? json.data.invalid : []);
        setBulkSummary(json.data.summary ?? { total: bulkRows.length, valid: 0, invalid: 0 });
      } else {
        const msg = typeof json.error === "string" ? json.error : json.error?.message || "Validation failed";
        setBulkError(msg);
      }
    } catch (e: unknown) {
      setBulkError((e as Error)?.message || "Network error");
    } finally {
      setBulkValidating(false);
    }
  }, [bulkRows]);

  const closeBulk = useCallback(() => {
    setBulkOpen(false);
    setBulkFile(null);
    setBulkRows([]);
    setBulkValid([]);
    setBulkInvalid([]);
    setBulkSummary(null);
    setBulkResult(null);
    setBulkError(null);
    setBulkCommitConfirm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const commitBulk = useCallback(async () => {
    if (bulkValid.length === 0) {
      setBulkError("No valid rows to commit.");
      return;
    }
    setBulkCommitting(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/admin/users/bulk/commit", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ rows: bulkValid, confirm: "BULK_IMPORT" }),
      });
      const json = await res.json();
      if (json.success) {
        const d = json.data ?? {};
        setBulkResult({ imported: d.importedCount ?? 0, failed: d.failedCount ?? 0 });
        setBulkValid([]);
        loadUsers();
      } else {
        const msg = typeof json.error === "string" ? json.error : json.error?.message || "Commit failed";
        setBulkError(msg);
      }
    } catch (e: unknown) {
      setBulkError((e as Error)?.message || "Network error");
    } finally {
      setBulkCommitting(false);
    }
  }, [bulkValid, loadUsers]);

  const statusBadge = (u: User) => {
    const s = (u.status || "ACTIVE").toString().toUpperCase();
    const cls =
      s === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" :
      s === "SUSPENDED" ? "bg-rose-500/10 text-rose-400" :
      s === "LOCKED" ? "bg-amber-500/10 text-amber-400" :
      "bg-slate-500/10 text-slate-400";
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
        {s}
      </span>
    );
  };

  const guardianLabel = (u: User) => {
    const gid = u.guardianId || u.parentId;
    if (!gid) return null;
    const guardian = users.find((g) => g.id === gid);
    return guardian ? guardian.name || guardian.email || gid : gid;
  };

  const displayName = (u: User) => u.name || u.email || "—";
  const displayRoll = (u: User) => u.uniqueId || u.employeeId || u.loginIdentifier || "—";

  if (loading && users.length === 0) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition"
          >
            <Search className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => { setBulkOpen(true); setBulkResult(null); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--action-primary)] text-white text-xs font-semibold hover:brightness-110 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Bulk Import
          </button>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, roll, email, or role…"
            className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg pl-9 pr-9 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-bold"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {flash && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${flash.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
          {flash.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {flash.msg}
        </div>
      )}

      {error && (
        <div className="px-4 py-2.5 rounded-lg bg-rose-500/10 text-rose-400 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)] bg-white/5">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Roll / ID</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Department</th>
                <th className="p-4 font-medium">Guardian</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">
                    {loading ? "Loading users…" : "No users found"}
                  </td>
                </tr>
              ) : (
                paged.map((u) => {
                  const isSuspended = (u.status || "").toUpperCase() === "SUSPENDED";
                  const rowBusy = busyRow === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition">
                      <td className="p-4">
                        <div className="font-medium text-[var(--text-primary)]">{displayName(u)}</div>
                        {u.email && u.name && u.email !== u.name && (
                          <div className="text-xs text-[var(--text-muted)]">{u.email}</div>
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs text-[var(--text-muted)]">{displayRoll(u)}</td>
                      <td className="p-4 uppercase text-xs font-semibold text-purple-400">{u.role || "—"}</td>
                      <td className="p-4">{statusBadge(u)}</td>
                      <td className="p-4 text-xs text-[var(--text-muted)]">{u.departmentId || "All Campus"}</td>
                      <td className="p-4 text-xs">
                        {guardianLabel(u) ? (
                          <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                            <Hash className="w-3 h-3 text-[var(--text-muted)]" />
                            {guardianLabel(u)}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => (isSuspended ? setStatus(u, "ACTIVE") : setSuspendTarget({ user: u, suspend: true }))}
                            disabled={rowBusy}
                            title={isSuspended ? "Activate" : "Suspend"}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-40 ${
                              isSuspended
                                ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                            }`}
                          >
                            {rowBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSuspended ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                            {isSuspended ? "Activate" : "Suspend"}
                          </button>
                          <button
                            onClick={() => openSecretModal("password", u)}
                            title="Reset password"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Password</span>
                          </button>
                          <button
                            onClick={() => openSecretModal("pin", u)}
                            title="Reset PIN"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">PIN</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-2.5 text-xs text-[var(--text-muted)] border-t border-[var(--border)]">
            <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuery(query)}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded border border-[var(--border)] disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setQuery(query)}
                disabled={page * pageSize >= filtered.length}
                className="px-2.5 py-1 rounded border border-[var(--border)] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suspend confirm */}
      {suspendTarget && (
        <ConfirmDialog
          open
          onClose={() => setSuspendTarget(null)}
          title="Suspend this user?"
          body={`This will suspend ${displayName(suspendTarget.user)} and revoke all active sessions. You can reactivate later.`}
          confirmText="Suspend"
          onConfirm={() => {
            setStatus(suspendTarget.user, "SUSPENDED");
            setSuspendTarget(null);
          }}
        />
      )}

      {/* Password / PIN reset modal */}
      {modal && modalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  {modal === "password" ? <KeyRound className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {modal === "password" ? "Reset password" : "Reset PIN"}
                </h3>
              </div>
              <button onClick={closeSecretModal} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Set a new {modal === "password" ? "password" : "8-digit PIN"} for{" "}
              <span className="text-[var(--text-primary)] font-medium">{displayName(modalTarget)}</span>.
            </p>
            <input
              type="text"
              value={secretValue}
              onChange={(e) => setSecretValue(e.target.value)}
              autoFocus
              placeholder={modal === "password" ? "New password (min 8 chars)" : "8-digit PIN"}
              className={`w-full bg-[var(--bg-elevated)] border rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${secretError ? "border-rose-500/50" : "border-[var(--border)]"}`}
            />
            {secretError && <p className="mt-2 text-xs text-rose-400">{secretError}</p>}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeSecretModal} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition">
                Cancel
              </button>
              <button
                onClick={submitSecret}
                disabled={busy || !secretValue}
                className="rounded-lg bg-blue-500 hover:bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk import modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-auto">
          <div className="relative w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl my-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Bulk import users</h3>
              </div>
              <button onClick={closeBulk} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-[var(--text-muted)] mb-4">
              Upload a CSV with a header row (e.g. <code className="text-[11px]">name,email,roll,role,department</code>).
              Validate first, then commit only the valid rows.
            </p>

            <div className="flex items-center gap-3 mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFileSelect(f);
                }}
                className="text-sm text-[var(--text-muted)] file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-[var(--border)] file:bg-[var(--bg-elevated)] file:text-xs file:font-medium file:text-[var(--text-primary)] file:hover:bg-white/5"
              />
              {bulkFile && <span className="text-xs text-[var(--text-muted)] truncate">{bulkFile.name} ({bulkRows.length} rows)</span>}
            </div>

            {bulkRows.length > 0 && (
              <button
                onClick={validateBulk}
                disabled={bulkValidating}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--action-primary)] text-white text-xs font-semibold hover:brightness-110 transition disabled:opacity-40 mb-4"
              >
                {bulkValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Validate
              </button>
            )}

            {bulkSummary && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-[var(--bg-elevated)] p-3 text-center">
                  <div className="text-xl font-bold text-[var(--text-primary)]">{bulkSummary.valid}</div>
                  <div className="text-xs text-[var(--text-muted)]">Valid</div>
                </div>
                <div className="rounded-lg bg-[var(--bg-elevated)] p-3 text-center">
                  <div className="text-xl font-bold text-rose-400">{bulkSummary.invalid}</div>
                  <div className="text-xs text-[var(--text-muted)]">Invalid</div>
                </div>
                <div className="rounded-lg bg-[var(--bg-elevated)] p-3 text-center">
                  <div className="text-xl font-bold text-[var(--text-primary)]">{bulkSummary.total}</div>
                  <div className="text-xs text-[var(--text-muted)]">Total</div>
                </div>
              </div>
            )}

            {bulkInvalid.length > 0 && (
              <div className="max-h-40 overflow-auto rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 mb-4 text-xs">
                <div className="font-semibold text-rose-400 mb-2">Invalid rows</div>
                {bulkInvalid.map((row, i) => (
                  <div key={i} className="mb-1.5">
                    <span className="text-[var(--text-muted)]">Row {row.index + 1}: </span>
                    <span className="text-rose-300">{row.errors.join("; ")}</span>
                  </div>
                ))}
              </div>
            )}

            {bulkResult && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Imported {bulkResult.imported}, failed {bulkResult.failed}
              </div>
            )}

            {bulkError && (
              <div className="px-4 py-2.5 rounded-lg bg-rose-500/10 text-rose-400 text-sm mb-4">{bulkError}</div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={closeBulk} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition">
                Close
              </button>
              {bulkValid.length > 0 && !bulkResult && (
                <button
                  onClick={() => setBulkCommitConfirm(true)}
                  disabled={bulkCommitting}
                  className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
                >
                  Commit {bulkValid.length}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk commit confirm */}
      {bulkCommitConfirm && (
        <ConfirmDialog
          open
          onClose={() => setBulkCommitConfirm(false)}
          title={`Commit ${bulkValid.length} valid rows?`}
          body="Valid rows will be imported permanently. Invalid rows are skipped. This action cannot be undone."
          confirmText="Commit"
          variant="primary"
          onConfirm={async () => {
            setBulkCommitConfirm(false);
            await commitBulk();
          }}
        />
      )}
    </div>
  );
}
