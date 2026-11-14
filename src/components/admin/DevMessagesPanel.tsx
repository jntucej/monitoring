"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";

interface DevMessage {
  id: string;
  user_name: string;
  user_role: string;
  user_email: string;
  message: string;
  channel: string;
  read_at: string | null;
  created_at: string;
}

/**
 * Dashboard panel: incoming direct-to-developer messages from any user role.
 * Self-contained — mount on any admin dashboard; polls every 60s.
 */
export function DevMessagesPanel() {
  const [messages, setMessages] = useState<DevMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dev/contact?limit=10", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) setMessages(data.data || []);
    } catch {
      /* panel is non-critical */
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + visibility-aware polling (no raw setInterval)
  useEffect(() => {
    load().catch(() => {});
  }, [load]);
  usePolling(load, { intervalMs: 60_000 });

  return (
    <div className="surface-card bg-bg-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-action-success" />
        <h3 className="text-sm font-semibold text-text-primary">
          Developer Messages
        </h3>
        <span className="text-xs text-text-muted">
          {messages.filter((m) => !m.read_at).length} unread
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted">Loading…</p>
      ) : messages.length === 0 ? (
        <p className="text-xs text-text-muted">
          No direct messages yet. Users can send one from any dashboard&#39;s
          “Developer” card or the Support page.
        </p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-lg border p-3 ${
                m.read_at
                  ? "border-border opacity-70"
                  : "border-emerald-500/40 bg-emerald-500/5"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-text-primary">
                  <Send className="size-3.5" />
                  {m.user_name || "Unknown user"}
                  <span className="surface-card uppercase tracking-wide text-xs px-1.5 py-0.5 bg-bg-base">
                    {m.user_role}
                  </span>
                </span>
                <span className="text-text-muted">
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </div>
              {m.user_email && (
                <p className="text-xs text-text-muted mt-0.5">{m.user_email}</p>
              )}
              <p className="text-sm text-text-primary mt-1.5 whitespace-pre-wrap">
                {m.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
