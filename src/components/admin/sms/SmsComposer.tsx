"use client";

import { useEffect, useState } from "react";
import { Send, Loader2, MessageSquare, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getAuthHeaders } from "@/lib/utils";

interface Tpl {
  code: string;
  label: string;
  body: string;
  variables: string[];
  dlt_template_id: string | null;
  category: string;
}

const SEGMENTS = [
  "all_parents",
  "all_students",
  "hostellers",
  "day_scholars",
] as const;

export function SmsComposer() {
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [code, setCode] = useState("");
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]>("all_parents");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetch("/api/admin/sms/templates", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setTemplates(j.data.templates as Tpl[]);
      })
      .catch(() => addToast({ variant: "error", title: "Failed", message: "Could not load SMS templates." }));
  }, [addToast]);

  const tpl = templates.find((t) => t.code === code);

  const submit = async () => {
    if (!code) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/sms/compose", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ templateCode: code, segment, vars, priority: "normal" }),
      });
      const json = await res.json();
      if (json.success) {
        addToast({
          variant: "success",
          title: "Queued",
          message: `${json.data.queued} SMS queued for dispatch.`,
        });
      } else {
        addToast({
          variant: "error",
          title: "Failed",
          message: json.message ?? json.error ?? "Failed to queue SMS batch.",
        });
      }
    } catch {
      addToast({ variant: "error", title: "Network error", message: "Could not reach the server." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <MessageSquare className="w-4 h-4" aria-hidden="true" /> Template
        </h3>
        <select
          className="surface-card w-full bg-bg-surface px-2 py-2 text-sm"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setVars({});
          }}
          aria-label="Select SMS template"
        >
          <option value="">— select —</option>
          {templates.map((t) => (
            <option key={t.code} value={t.code}>
              {t.label}
              {!t.dlt_template_id ? "  (⚠ no DLT ID yet)" : ""}
            </option>
          ))}
        </select>

        {tpl && (
          <>
            <pre className="surface-card text-xs p-2 bg-bg-elevated whitespace-pre-wrap overflow-x-auto">
              {tpl.body}
            </pre>
            <p className="text-xs text-text-muted">
              Variables: {tpl.variables.length ? tpl.variables.join(", ") : "none"}
            </p>
            {!tpl.dlt_template_id && (
              <div className="surface-card flex items-start gap-2 text-xs text-action-warning bg-action-warning/10 p-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  This template has no DLT_TEMPLATE_ID yet. SMS will queue as &ldquo;failed&rdquo; and
                  retry automatically once the sysadmin registers the template and fills in the ID.
                </span>
              </div>
            )}
            {tpl.variables.map((v) => (
              <Input
                key={v}
                placeholder={v}
                value={vars[v] ?? ""}
                onChange={(e) => setVars((x) => ({ ...x, [v]: e.target.value }))}
                label={v}
                className="text-sm"
              />
            ))}
          </>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm">Recipient segment</h3>
        <div className="grid grid-cols-2 gap-2">
          {SEGMENTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSegment(s)}
              aria-pressed={segment === s}
              className={`px-3 py-2 rounded border text-sm transition-colors ${
                segment === s
                  ? "bg-action-primary/20 border-action-primary text-text-primary"
                  : "border-border text-text-secondary hover:bg-bg-elevated"
              }`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </Card>

      <Button onClick={submit} disabled={!code || sending}>
        {sending ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="w-4 h-4" aria-hidden="true" />
        )}
        {sending ? "Queueing…" : "Queue SMS"}
      </Button>
    </div>
  );
}
