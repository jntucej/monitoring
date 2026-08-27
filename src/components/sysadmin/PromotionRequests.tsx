"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { UserCheck, CheckCircle, XCircle, Plus, RefreshCw, Send } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

interface RoleRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  targetUserId: string;
  targetUserName: string;
  targetCurrentRole: string;
  newRole: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string;
  approverName?: string;
  createdAt: string;
}

export function PromotionRequests() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // New Request Modal
  const [showModal, setShowModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const url = filterStatus !== "ALL"
        ? `/api/admin/role-requests?status=${filterStatus}`
        : "/api/admin/role-requests";

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (res.ok && data.success) {
        setRequests(data.data || []);
      }
    } catch {
      // Best effort fetch
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (requestId: string, status: "APPROVED" | "REJECTED") => {
    try {
      const headers = {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      };
      const res = await fetch(`/api/admin/role-requests/${requestId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || `Failed to ${status.toLowerCase()} request`);
      }

      addToast({
        title: "Success",
        message: `Role request ${status.toLowerCase()} successfully`,
        variant: "success",
      });
      fetchRequests();
    } catch (err: any) {
      addToast({ title: "Error", message: err.message, variant: "error" });
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) return;
    setSubmitting(true);

    try {
      const headers = {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      };
      const res = await fetch("/api/admin/role-requests", {
        method: "POST",
        headers,
        body: JSON.stringify({ targetUserId, newRole, reason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to submit promotion request");
      }

      addToast({ title: "Submitted", message: "Promotion request submitted for approval", variant: "success" });
      setShowModal(false);
      setTargetUserId("");
      setReason("");
      fetchRequests();
    } catch (err: any) {
      addToast({ title: "Submission Failed", message: err.message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">APPROVED</span>;
      case "REJECTED":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">REJECTED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">PENDING</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)]">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-sky-400" /> Role Promotion Workflow
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Governed process for requesting and approving administrative role elevation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md"
          >
            <Plus className="w-4 h-4" /> Request Promotion
          </button>
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-white hover:bg-gray-800 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-xs font-bold">
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === st
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "text-[var(--text-muted)] hover:text-white"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Table List */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">Loading role elevation requests...</div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">No role promotion requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-elevated)]/40">
                  <th className="p-4">Target User</th>
                  <th className="p-4">Requested Role</th>
                  <th className="p-4">Requester</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-[var(--bg-elevated)]/30 transition-colors">
                    <td className="p-4 font-bold text-white">
                      {req.targetUserName}
                      <span className="block text-[10px] font-mono text-[var(--text-muted)]">Current: {req.targetCurrentRole}</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                        {req.newRole}
                      </span>
                    </td>
                    <td className="p-4 text-white">
                      {req.requesterName}
                      <span className="block text-[10px] font-mono text-[var(--text-muted)]">{req.requesterRole}</span>
                    </td>
                    <td className="p-4 text-[var(--text-muted)] max-w-xs truncate">{req.reason}</td>
                    <td className="p-4">{getStatusBadge(req.status)}</td>
                    <td className="p-4 text-right">
                      {req.status === "PENDING" && (user?.role === "sysadmin" || user?.role === "admin") ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(req.id, "APPROVED")}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                          >
                            <CheckCircle className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => handleAction(req.id, "REJECTED")}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px]"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {req.approverName ? `By ${req.approverName}` : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* New Promotion Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateRequest} className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-2xl space-y-4 max-w-md w-full">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-sky-400" /> Request Role Promotion
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[var(--text-muted)] font-medium">Target User ID (UUID)</label>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[var(--text-muted)] font-medium">Target Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="admin">admin</option>
                  <option value="sysadmin">sysadmin</option>
                  <option value="warden">warden</option>
                  <option value="operator">operator</option>
                  <option value="faculty">faculty</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[var(--text-muted)] font-medium">Reason for Promotion</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain justification for role change..."
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 h-20"
                  required
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
              >
                <Send className="w-3.5 h-3.5" /> Submit Request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
