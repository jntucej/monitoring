"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Filter, RefreshCw, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PermissionRow, type PermissionItem } from "./PermissionRow";
import { BulkActionsBar } from "./BulkActionsBar";
import { PermissionDetailPanel } from "./PermissionDetailPanel";
import { useUIStore } from "@/stores/uiStore";
import { getAuthHeaders } from "@/lib/utils";

export interface PermissionListProps {
  title: string;
  description?: string;
  subtitle?: string;
  workflowType?: string;
  stageFilter?: string;
  currentStage?: string;
  hostelScope?: "boys" | "girls";
  initialPermissions?: PermissionItem[];
  fetchUrl?: string;
  allowForward?: boolean;
}

export function PermissionList({
  title,
  description,
  subtitle,
  workflowType,
  stageFilter,
  currentStage,
  hostelScope,
  initialPermissions = [],
  fetchUrl,
  allowForward = false,
}: PermissionListProps) {
  const [permissions, setPermissions] = useState<PermissionItem[]>(initialPermissions);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [activeDetailTicket, setActiveDetailTicket] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const effectiveDescription = description || subtitle || "";
  const effectiveStage = stageFilter || currentStage;

  const getEffectiveUrl = useCallback(() => {
    if (fetchUrl) return fetchUrl;
    const params = new URLSearchParams();
    if (workflowType) params.set("workflowType", workflowType);
    if (effectiveStage) params.set("stage", effectiveStage);
    if (hostelScope) params.set("hostelScope", hostelScope);
    const qs = params.toString();
    return `/api/permissions${qs ? `?${qs}` : ""}`;
  }, [fetchUrl, workflowType, effectiveStage, hostelScope]);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const url = getEffectiveUrl();
      const res = await fetch(url, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPermissions(json.data);
      } else {
        addToast({
          message: json.error?.message || "Failed to load permissions",
          variant: "error",
        });
      }
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : "Network error",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [getEffectiveUrl, addToast]);

  useEffect(() => {
    let ignore = false;
    const url = getEffectiveUrl();
    fetch(url, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((json) => {
        if (!ignore && json.success && Array.isArray(json.data)) {
          setPermissions(json.data);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [getEffectiveUrl]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) {
        return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const studentName = p.student?.name?.toLowerCase() || "";
      const roll = p.student?.student_details?.roll?.toLowerCase() || "";
      const ticket = p.ticket_number?.toLowerCase() || "";
      return studentName.includes(q) || roll.includes(q) || ticket.includes(q);
    });
  }, [permissions, searchQuery, statusFilter]);

  const handleToggleSelect = (ticket: string) => {
    setSelectedTickets((prev) => {
      const next = new Set(prev);
      if (next.has(ticket)) {
        next.delete(ticket);
      } else {
        next.add(ticket);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedTickets.size === filteredPermissions.length && filteredPermissions.length > 0) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(filteredPermissions.map((p) => p.ticket_number)));
    }
  };

  const handleSingleAction = async (
    ticket: string,
    action: "APPROVE" | "REJECT" | "FORWARD" | "ESCALATE",
    comment?: string
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/permissions/${encodeURIComponent(ticket)}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, comment }),
      });
      const json = await res.json();
      if (json.success) {
        addToast({
          message: `Ticket ${ticket} ${action.toLowerCase()}d successfully`,
          variant: action === "REJECT" ? "info" : "success",
        });
        await fetchPermissions();
      } else {
        addToast({
          message: json.error?.message || `Failed to ${action.toLowerCase()} ticket`,
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

  const handleBulkAction = async (
    action: "APPROVE" | "REJECT" | "FORWARD",
    comment?: string
  ) => {
    if (selectedTickets.size === 0) return;
    setActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const ticket of Array.from(selectedTickets)) {
      try {
        const res = await fetch(`/api/permissions/${encodeURIComponent(ticket)}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ action, comment }),
        });
        const json = await res.json();
        if (json.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    addToast({
      message: `Bulk ${action.toLowerCase()}: ${successCount} succeeded, ${failCount} failed`,
      variant: failCount > 0 ? "warning" : "success",
    });

    setSelectedTickets(new Set());
    await fetchPermissions();
    setActionLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
          {effectiveDescription && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{effectiveDescription}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={fetchPermissions}
            loading={loading}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border)]">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, roll, or ticket..."
            className="pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <div className="flex items-center gap-1">
            {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === status
                    ? "bg-[var(--action-primary)] text-white"
                    : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredPermissions.length > 0 && (
        <div className="flex items-center justify-between px-1 text-xs text-[var(--text-muted)]">
          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="hover:text-[var(--text-primary)] font-medium"
          >
            {selectedTickets.size === filteredPermissions.length
              ? "Deselect all visible"
              : `Select all visible (${filteredPermissions.length})`}
          </button>
          <span>Showing {filteredPermissions.length} requests</span>
        </div>
      )}

      {filteredPermissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-[var(--text-muted)]" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              No permission requests found
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm">
              {searchQuery || statusFilter !== "ALL"
                ? "No items match your active search or filter criteria."
                : "There are currently no permission requests assigned to this queue."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPermissions.map((req) => (
            <PermissionRow
              key={req.id || req.ticket_number}
              request={req}
              isSelected={selectedTickets.has(req.ticket_number)}
              onToggleSelect={handleToggleSelect}
              onViewDetails={(ticket) => setActiveDetailTicket(ticket)}
              onQuickApprove={(ticket) => handleSingleAction(ticket, "APPROVE")}
              onQuickReject={(ticket) => handleSingleAction(ticket, "REJECT")}
              loadingAction={actionLoading}
            />
          ))}
        </div>
      )}

      <BulkActionsBar
        selectedCount={selectedTickets.size}
        onApprove={() => handleBulkAction("APPROVE")}
        onReject={(comment) => handleBulkAction("REJECT", comment)}
        onForward={allowForward ? (comment) => handleBulkAction("FORWARD", comment) : undefined}
        onClear={() => setSelectedTickets(new Set())}
        isLoading={actionLoading}
      />

      {activeDetailTicket && (
        <PermissionDetailPanel
          ticket={activeDetailTicket}
          onClose={() => setActiveDetailTicket(null)}
          onActionComplete={() => {
            fetchPermissions();
          }}
        />
      )}
    </div>
  );
}
