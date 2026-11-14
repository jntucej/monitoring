"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Save, FileText } from "lucide-react";
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
  sender_id: string;
  dlt_template_id: string | null;
  category: string;
  is_active: boolean;
}

export function SmsTemplates() {
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [selected, setSelected] = useState<Tpl | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editDltId, setEditDltId] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const load = async () => {
    try {
      const res = await fetch("/api/admin/sms/templates?all=true", { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data.templates as Tpl[]);
      }
    } catch {
      addToast({ variant: "error", title: "Failed", message: "Could not load SMS templates." });
    }
  };

  useEffect(() => {
    load();
  }, [addToast]);

  const selectTpl = (t: Tpl) => {
    setSelected(t);
    setEditBody(t.body);
    setEditDltId(t.dlt_template_id ?? "");
    setEditLabel(t.label);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sms/templates/${selected.code}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editLabel,
          body: editBody,
          dlt_template_id: editDltId.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        addToast({ variant: "success", title: "Saved", message: `Template '${selected.code}' updated.` });
        load();
      } else {
        addToast({ variant: "error", title: "Failed", message: json.message ?? "Could not save template." });
      }
    } catch {
      addToast({ variant: "error", title: "Network error", message: "Could not save template." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" aria-hidden="true" /> SMS Templates
        </h2>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Refresh
        </Button>
      </div>

      <div className="grid md:grid-cols-[240px_1fr] gap-4">
        <div className="space-y-1">
          {templates.map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => selectTpl(t)}
              aria-pressed={selected?.code === t.code}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                selected?.code === t.code
                  ? "bg-action-primary/20 text-text-primary"
                  : "hover:bg-bg-elevated text-text-secondary"
              }`}
            >
              <span className="font-medium">{t.label}</span>
              <span className="block text-xs text-text-muted">{t.code}</span>
            </button>
          ))}
        </div>

        {selected && (
          <Card className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-text-muted uppercase">Label</label>
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted uppercase">
                DLT Template ID
                {!selected.dlt_template_id && " (not registered yet)"}
              </label>
              <Input
                value={editDltId}
                onChange={(e) => setEditDltId(e.target.value)}
                placeholder="Fill in after DLT registration"
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted uppercase">Body</label>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={4}
                className="surface-card mt-1 w-full bg-bg-surface p-2 text-sm font-mono"
              />
              <p className="text-xs text-text-muted mt-1">
                Variables: {selected.variables.length ? selected.variables.map((v) => `{#${v}#}`).join("  ") : "none"}
              </p>
            </div>
            <div>
              <Button onClick={save} disabled={saving} size="sm">
                <Save className="w-3.5 h-3.5" aria-hidden="true" /> {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
