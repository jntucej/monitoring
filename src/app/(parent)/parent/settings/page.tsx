"use client";

import React, { useState, useEffect } from "react";
import { Bell, User, Shield, Save, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function ParentSettingsPage() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "Parent User");
  const [email, setEmail] = useState(user?.email || "parent@college.edu");
  const [phone, setPhone] = useState(user?.phone || "+91 98765 43210");
  const [notifyEntryExit, setNotifyEntryExit] = useState(true);
  const [notifyPassUpdates, setNotifyPassUpdates] = useState(true);
  const [notifyEmergency, setNotifyEmergency] = useState(true);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (user) {
      setUser({ ...user, name, email, phone });
    }
    setCurrentPin("");
    setNewPin("");
    setStatusMessage("Settings updated successfully!");
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Guardian Settings</h1>
        <p className="text-xs text-[var(--text-muted)]">Manage preferences and profile</p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{statusMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2 text-[var(--text-primary)]">
              <User className="w-4 h-4 text-[var(--action-primary)]" /> Profile Details
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-medium">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]" required />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-medium">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]" required />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-medium">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]" />
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2 text-[var(--text-primary)]">
              <Bell className="w-4 h-4 text-[var(--action-warning)]" /> Notifications
            </h3>
            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-base)]/50 border border-[var(--border)] cursor-pointer">
                <span className="text-[var(--text-primary)]">Gate alerts</span>
                <input type="checkbox" checked={notifyEntryExit} onChange={(e) => setNotifyEntryExit(e.target.checked)} className="w-4 h-4 accent-sky-500 rounded" />
              </label>
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-base)]/50 border border-[var(--border)] cursor-pointer">
                <span className="text-[var(--text-primary)]">Pass updates</span>
                <input type="checkbox" checked={notifyPassUpdates} onChange={(e) => setNotifyPassUpdates(e.target.checked)} className="w-4 h-4 accent-sky-500 rounded" />
              </label>
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-base)]/50 border border-[var(--border)] cursor-pointer">
                <span className="text-[var(--text-primary)]">Emergency alerts</span>
                <input type="checkbox" checked={notifyEmergency} onChange={(e) => setNotifyEmergency(e.target.checked)} className="w-4 h-4 accent-sky-500 rounded" />
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-xs hover:bg-sky-500 transition-colors shadow-md disabled:opacity-50">
            <Save className="w-4 h-4" /> Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}