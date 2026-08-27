"use client";

import { useEffect, useState } from "react";
import { FileBadge, Save, Loader2, Plus, Trash2 } from "lucide-react";

export function PassTypesForm() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/config/pass-types")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/config/pass-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        setMessage("Pass types saved successfully.");
      } else {
        setMessage(json.error?.message || "Failed to save.");
      }
    } catch {
      setMessage("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const addType = () => {
    setData([...data, { code: 'new_pass', name: 'New Pass', description: '', defaultDurationHours: 24, requiresApproval: true, approvalFlow: 'warden' }]);
  };

  const removeType = (index: number) => {
    const newData = [...data];
    newData.splice(index, 1);
    setData(newData);
  };

  const updateType = (index: number, key: string, value: any) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [key]: value };
    setData(newData);
  };

  if (loading) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <FileBadge className="w-5 h-5 text-[var(--action-primary)]" />
          Gate Pass Types
        </h3>
        <div className="flex justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 flex flex-col h-full col-span-1 lg:col-span-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FileBadge className="w-5 h-5 text-[var(--action-primary)]" />
          Gate Pass Types
        </h3>
        <button type="button" onClick={addType} className="text-xs flex items-center gap-1 bg-[var(--bg-base)] px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-surface-hover)]">
          <Plus className="w-3 h-3" /> Add Type
        </button>
      </div>

      <div className="space-y-4 flex-1">
        {data.map((item, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border border-[var(--border)] p-3 rounded-lg bg-[var(--bg-base)]">
            <div className="md:col-span-3">
              <label className="block text-[10px] uppercase text-[var(--text-muted)] mb-1">Code / Auth key</label>
              <input type="text" value={item.code} onChange={e => updateType(i, 'code', e.target.value)} className="w-full px-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded text-xs" required />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] uppercase text-[var(--text-muted)] mb-1">Display Name</label>
              <input type="text" value={item.name} onChange={e => updateType(i, 'name', e.target.value)} className="w-full px-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded text-xs" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase text-[var(--text-muted)] mb-1">Duration (Hrs)</label>
              <input type="number" value={item.defaultDurationHours} onChange={e => updateType(i, 'defaultDurationHours', parseInt(e.target.value))} className="w-full px-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded text-xs" />
            </div>
            <div className="md:col-span-3 flex items-center gap-2 pt-4">
              <label className="text-xs flex items-center gap-1">
                <input type="checkbox" checked={item.requiresApproval} onChange={e => updateType(i, 'requiresApproval', e.target.checked)} className="accent-[var(--action-primary)]" />
                Requires Auth
              </label>
            </div>
            <div className="md:col-span-1 pt-4 text-right">
              <button type="button" onClick={() => removeType(i)} className="text-rose-500 hover:text-rose-400 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-xs text-[var(--text-muted)] text-center py-4">No pass types configured.</p>}

        {message && (
          <div className="text-sm mt-2 font-medium text-[var(--action-primary)]">
            {message}
          </div>
        )}
      </div>

      <div className="flex justify-end mt-4 pt-4 border-t border-[var(--border)]">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--action-primary)] text-white font-medium hover:brightness-110 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Passes
        </button>
      </div>
    </form>
  );
}