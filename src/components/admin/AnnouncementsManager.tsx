"use client";

import { useEffect, useState, useCallback } from "react";
import { useUIStore } from "@/stores/uiStore";
import { getAuthHeaders } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { WidgetLoading } from "@/components/shared/LoadingStates";
import { Megaphone, Plus, Trash2, Eye, EyeOff, Send, Calendar } from "lucide-react";
import type { BadgeVariant } from "@/components/ui/badge";

function statusBadgeVariant(isPub: boolean, hasSchedule: boolean): BadgeVariant {
  if (isPub) return "success";
  if (hasSchedule) return "dayout";
  return "offline";
}

function priorityBadgeVariant(p: string | null): BadgeVariant {
  if (p === "critical" || p === "high") return "exit";
  if (p === "medium") return "success";
  return "offline";
}

type Announcement = {
  id: string;
  title: string;
  message: string;
  priority: string | null;
  audience: string | null;
  scheduled_at: string | null;
  is_published: boolean;
  created_at: string;
};

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All Users" },
  { value: "operator", label: "Operators" },
  { value: "faculty", label: "Faculty" },
  { value: "student", label: "Students" },
  { value: "staff", label: "Staff" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function AnnouncementsManager() {
  const { addToast } = useUIStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [priority, setPriority] = useState("medium");
  const [publishNow, setPublishNow] = useState(true);
  const [publishAt, setPublishAt] = useState("");

  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    body: string;
    action: () => Promise<void>;
  }>({ open: false, title: "", body: "", action: async () => {} });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", { headers: getAuthHeaders() });
      const result = await res.json();
      const rows: Announcement[] = result.data?.rows ?? [];
      setAnnouncements(rows);
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to load announcements." });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          audience,
          priority,
          publishAt: publishNow ? undefined : publishAt || undefined,
          publishNow,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        addToast({ variant: "success", title: "Created", message: publishNow ? "Broadcast published." : "Broadcast scheduled." });
        setTitle("");
        setMessage("");
        setPublishNow(true);
        setPublishAt("");
        setShowCreate(false);
        fetchAnnouncements();
      } else {
        addToast({ variant: "error", title: "Error", message: result?.message ?? result?.error?.message ?? "Failed to create announcement." });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to create announcement." });
    }
  };

  const runPatch = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(patch),
    });
    const result = await res.json();
    if (!res.ok) {
      addToast({ variant: "error", title: "Error", message: result?.message ?? "Failed to update announcement." });
      return;
    }
    addToast({ variant: "success", title: "Updated", message: "Announcement saved." });
    fetchAnnouncements();
  };

  const handleTogglePublish = (a: Announcement) => {
    const newPub = !a.is_published;
    if (newPub) {
      setConfirm({
        open: true,
        title: "Publish announcement?",
        body: `"${a.title}" will be immediately visible to ${a.audience ?? "all"} users.`,
        action: () => runPatch(a.id, { publishNow: true, is_published: true }),
      });
    } else {
      runPatch(a.id, { is_published: false });
    }
  };

  const handleSchedule = (a: Announcement, when: string) => {
    if (!when) {
      addToast({ variant: "warning", title: "No time set", message: "Enter a future publish time first." });
      return;
    }
    setConfirm({
      open: true,
      title: "Schedule announcement?",
      body: `"${a.title}" will be scheduled to publish at ${new Date(when).toLocaleString()}.`,
      action: () => runPatch(a.id, { publishAt: when, is_published: false }),
    });
  };

  const handleDelete = (a: Announcement) => {
    setConfirm({
      open: true,
      title: "Delete announcement?",
      body: `"${a.title}" will be permanently removed. This cannot be undone.`,
      action: async () => {
        const res = await fetch(`/api/admin/announcements/${a.id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          addToast({ variant: "success", title: "Deleted", message: "Announcement removed." });
          fetchAnnouncements();
        } else {
          addToast({ variant: "error", title: "Error", message: "Failed to delete announcement." });
        }
      },
    });
  };

  const scheduleTime = (a: Announcement) => {
    const el = prompt("Schedule publish time (YYYY-MM-DDTHH:MM):", a.scheduled_at ?? "");
    if (el) handleSchedule(a, el);
  };

  if (loading) return <WidgetLoading />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-2xl font-bold tracking-tight">Announcements</p>
          <p className="text-sm text-gray-500">Create, schedule, and publish broadcast notifications.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
          <Plus className="w-4 h-4" /> {showCreate ? "Cancel" : "New Broadcast"}
        </Button>
      </div>

      {showCreate && (
        <Card className="border p-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-500" /> Create Broadcast
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Title"
                maxLength={200}
                className="p-2 border rounded text-sm"
              />
              <select value={audience} onChange={(e) => setAudience(e.target.value)} className="p-2 border rounded text-sm">
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="p-2 border rounded text-sm">
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={3}
              placeholder="Message body..."
              maxLength={10000}
              className="w-full p-2 border rounded text-sm"
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={publishNow}
                  onChange={() => setPublishNow(true)}
                  className="accent-emerald-500"
                />
                <Send className="w-3.5 h-3.5" /> Publish now
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={!publishNow}
                  onChange={() => setPublishNow(false)}
                  className="accent-amber-500"
                />
                <Calendar className="w-3.5 h-3.5" /> Schedule for later
              </label>
              {!publishNow && (
                <input
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                  className="p-1.5 border rounded text-sm"
                />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" size="sm" className="gap-1">
                {publishNow ? <Send className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                {publishNow ? "Publish" : "Schedule"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {announcements.length === 0 && (
          <Card className="border p-6 text-center text-sm text-gray-500">No announcements yet.</Card>
        )}
        {announcements.map((a) => (
          <Card key={a.id} className="border p-4">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-base">{a.title}</h3>
                  <Badge variant={statusBadgeVariant(a.is_published, !!a.scheduled_at)}>
                    {a.is_published ? "Published" : a.scheduled_at ? `Scheduled ${new Date(a.scheduled_at).toLocaleString()}` : "Draft"}
                  </Badge>
                  <Badge variant="entry" className="capitalize text-xs">{a.audience ?? "all"}</Badge>
                  {a.priority && (
                    <Badge variant={priorityBadgeVariant(a.priority)} className="text-xs">
                      {a.priority}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 break-words">{a.message}</p>
                <p className="text-xs text-gray-400">
                  {a.is_published && !a.scheduled_at ? "Live now" : a.scheduled_at ? `Scheduled for ${new Date(a.scheduled_at).toLocaleString()}` : "Not yet published"}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!a.is_published && (
                  <Button variant="ghost" size="sm" title="Schedule" onClick={() => scheduleTime(a)}>
                    <Calendar className="w-4 h-4 text-amber-500" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" title={a.is_published ? "Unpublish" : "Publish"} onClick={() => handleTogglePublish(a)}>
                  {a.is_published ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-emerald-500" />}
                </Button>
                <Button variant="ghost" size="sm" title="Delete" onClick={() => handleDelete(a)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        title={confirm.title}
        body={confirm.body}
        onConfirm={confirm.action}
        confirmText="Confirm"
        variant="destructive"
      />
    </div>
  );
}
