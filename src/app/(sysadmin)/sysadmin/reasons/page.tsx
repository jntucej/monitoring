"use client";

import React, { useState, useCallback, useMemo } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { useUIStore } from "@/stores/uiStore";
import { cn, formatDate } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { WorkflowType } from "@/lib/types";
import {
  MessageSquarePlus,
  Plus,
  Search,
  Trash2,
  Edit2,
  RefreshCw,
  Tag,
  Building2,
  FileCheck2,
  Briefcase,
  Layers,
  AlertCircle,
} from "lucide-react";

interface CustomReasonItem {
  id: string;
  code: string;
  label: string;
  workflow_type: WorkflowType;
  created_by?: string | null;
  created_at?: string;
}

const WORKFLOW_OPTIONS: { value: WorkflowType; label: string; icon: typeof Building2 }[] = [
  { value: "hostel", label: "Hostel Outpass", icon: Building2 },
  { value: "exam", label: "Exam & Certificate", icon: FileCheck2 },
  { value: "memo", label: "Department Memo", icon: Layers },
  { value: "staff_leave", label: "Staff Leave", icon: Briefcase },
];

export default function SysadminReasonsPage() {
const api = useApi();

  const { addToast } = useUIStore();
  const [reasons, setReasons] = useState<CustomReasonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | WorkflowType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<CustomReasonItem | null>(null);

  const [formId, setFormId] = useState("");
  const [formWorkflow, setFormWorkflow] = useState<WorkflowType>("hostel");
  const [formLabel, setFormLabel] = useState("");
  const [formCode, setFormCode] = useState("");
  const [isCodeDirty, setIsCodeDirty] = useState(false);

  const fetchReasons = useCallback(async () => {
    try {
      const res = await fetch("/api/config/custom-reasons", {
        headers: api.getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setReasons(json.data);
      }
    } catch {
      addToast({ variant: "error", message: "Failed to load custom reasons." });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useLiveRefresh(fetchReasons, { intervalMs: 30000 });

  const openCreateModal = () => {
    setModalMode("create");
    setFormId("");
    setFormWorkflow(activeTab !== "all" ? activeTab : "hostel");
    setFormLabel("");
    setFormCode("");
    setIsCodeDirty(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item: CustomReasonItem) => {
    setModalMode("edit");
    setFormId(item.id);
    setFormWorkflow(item.workflow_type);
    setFormLabel(item.label);
    setFormCode(item.code);
    setIsCodeDirty(true);
    setIsModalOpen(true);
  };

  const handleLabelChange = (newLabel: string) => {
    setFormLabel(newLabel);
    if (modalMode === "create" && !isCodeDirty) {
      const slug = newLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      setFormCode(slug ? `${formWorkflow}_${slug}` : "");
    }
  };

  const handleWorkflowChange = (newWorkflow: WorkflowType) => {
    setFormWorkflow(newWorkflow);
    if (modalMode === "create" && !isCodeDirty && formLabel) {
      const slug = formLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      setFormCode(slug ? `${newWorkflow}_${slug}` : "");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = formLabel.trim();
    const cleanCode = formCode.trim().toLowerCase();
    if (!cleanLabel) {
      addToast({ variant: "error", message: "Please provide a reason label." });
      return;
    }
    if (!cleanCode || !/^[a-z0-9_]+$/.test(cleanCode)) {
      addToast({ variant: "error", message: "Code must match /^[a-z0-9_]+$/." });
      return;
    }
    setSubmitting(true);
    try {
      const isCreate = modalMode === "create";
      const url = isCreate ? "/api/config/custom-reasons" : `/api/config/custom-reasons/${formId}`;
      const method = isCreate ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: api.getHeaders(),
        body: JSON.stringify({ code: cleanCode, label: cleanLabel, workflow_type: formWorkflow }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to save reason");
      addToast({ variant: "success", message: `Reason "${cleanLabel}" ${isCreate ? "added" : "updated"}.` });
      setIsModalOpen(false);
      await fetchReasons();
    } catch (err: unknown) {
      addToast({ variant: "error", message: (err as Error).message || "Save failed." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/config/custom-reasons/${deleteConfirmItem.id}`, {
        method: "DELETE",
        headers: api.getHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Delete failed");
      addToast({ variant: "success", message: `Reason "${deleteConfirmItem.label}" deleted.` });
      setDeleteConfirmItem(null);
      await fetchReasons();
    } catch (err: unknown) {
      addToast({ variant: "error", message: (err as Error).message || "Delete failed." });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReasons = useMemo(() => {
    return reasons.filter((item) => {
      const matchesTab = activeTab === "all" || item.workflow_type === activeTab;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || item.label.toLowerCase().includes(q) || item.code.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [reasons, activeTab, searchQuery]);

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <MessageSquarePlus className="w-6 h-6 text-purple-400" />
              Custom Permission Reasons
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Configure workflow-specific permission reasons across Hostel, Exam, Memo, and Staff Leave.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => fetchReasons()} disabled={loading} className="gap-1.5">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={openCreateModal} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add Reason
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2",
              activeTab === "all" ? "bg-[var(--action-primary)] text-white" : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border)]"
            )}
          >
            All Workflows ({reasons.length})
          </button>
          {WORKFLOW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setActiveTab(opt.value)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2",
                activeTab === opt.value ? "bg-[var(--action-primary)] text-white" : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border)]"
              )}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label} ({reasons.filter((r) => r.workflow_type === opt.value).length})
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search reasons or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </div>
          <span className="text-xs text-[var(--text-muted)]">Showing {filteredReasons.length} reasons</span>
        </div>

        <Card>
          <CardHeader className="pb-3 border-b border-[var(--border)]">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4 text-[var(--action-primary)]" />
              Configured Reasons
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading && reasons.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--text-muted)]">Loading reasons...</div>
            ) : filteredReasons.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-muted)]">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">No reasons found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] text-xs text-[var(--text-muted)] uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Reason Label</th>
                      <th className="px-5 py-3 font-semibold">Code</th>
                      <th className="px-5 py-3 font-semibold">Workflow</th>
                      <th className="px-5 py-3 font-semibold">Created</th>
                      <th className="px-5 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredReasons.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--bg-surface)]/50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-[var(--text-primary)]">{item.label}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-[var(--text-secondary)]">{item.code}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-xs capitalize font-medium border",
                              item.workflow_type === "hostel" && "border-purple-500/30 text-purple-400 bg-purple-500/10",
                              item.workflow_type === "exam" && "border-blue-500/30 text-blue-400 bg-blue-500/10",
                              item.workflow_type === "memo" && "border-amber-500/30 text-amber-400 bg-amber-500/10",
                              item.workflow_type === "staff_leave" && "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                            )}
                          >
                            {item.workflow_type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[var(--text-muted)] whitespace-nowrap">
                          {item.created_at ? formatDate(item.created_at) : "Default"}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(item)} className="h-8 w-8 p-0" aria-label="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmItem(item)} className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-500/10" aria-label="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === "create" ? "Add Custom Reason" : "Edit Custom Reason"} size="md">
          <form onSubmit={handleSave} className="space-y-4 p-4">
            <div className="w-full">
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase">
                Workflow Type
              </label>
              <Select
                value={formWorkflow}
                onChange={(val) => handleWorkflowChange(val as WorkflowType)}
                options={WORKFLOW_OPTIONS.map((w) => ({ value: w.value, label: w.label }))}
                disabled={submitting}
              />
            </div>
            <Input
              label="Reason Label"
              placeholder="e.g. Sports / Tournament"
              value={formLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              disabled={submitting}
              required
            />
            <Input
              label="Reason Code"
              placeholder="e.g. hostel_sports"
              value={formCode}
              onChange={(e) => {
                setIsCodeDirty(true);
                setFormCode(e.target.value.toLowerCase());
              }}
              disabled={submitting}
              required
              helper="Lowercase alphanumeric and underscores only (/^[a-z0-9_]+$/)."
            />
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submitting}>
                {modalMode === "create" ? "Create Reason" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={!!deleteConfirmItem} onClose={() => setDeleteConfirmItem(null)} title="Confirm Deletion" size="sm">
          <div className="p-4 space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Are you sure you want to delete reason <strong>{deleteConfirmItem?.label}</strong> ({deleteConfirmItem?.code})?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button type="button" variant="secondary" size="sm" onClick={() => setDeleteConfirmItem(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={handleDelete} loading={submitting}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AuthGuard>
  );
}

