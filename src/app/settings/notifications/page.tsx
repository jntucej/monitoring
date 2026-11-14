"use client";


import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

import { NotificationPreferences } from "@/lib/notification-types";
import { Bell, Smartphone, Mail, AppWindow, Save, CheckCircle2, Clock } from "lucide-react";

export default function NotificationSettingsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    userId: user?.id || "",
    channels: { push: true, sms: true, email: true, in_app: true },
    types: {
      visitor_arrival: true,
      visitor_checkout: true,
      visitor_overdue: true,
      worker_shift_start: true,
      worker_shift_end: true,
      worker_schedule_change: true,
      faculty_absent: true,
      faculty_late: true,
      gate_offline: true,
      gate_online: true,
      emergency_broadcast: true,
      pass_approved: true,
      pass_rejected: true,
    },
    quietHours: { start: "22:00", end: "06:00" },
  });

  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      setLoading(true);
      const res = await fetch("/api/notifications/preferences"); const json = await res.json().catch(() => null); const data = json?.data;
      if (data) {
        setPrefs(data);
      }
      setLoading(false);
    }
    load();
  }, [user?.id]);

  const handleChannelToggle = (channel: keyof NotificationPreferences['channels']) => {
    setPrefs(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel],
      },
    }));
  };

  const handleTypeToggle = (type: keyof NotificationPreferences['types']) => {
    setPrefs(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: !prev.types[type],
      },
    }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSavedSuccess(false);
    const res = await fetch("/api/notifications/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prefs) }); const json = await res.json().catch(() => null); const success = Boolean(json?.success);
    setSaving(false);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h100">
        <div className="size-5 border-4 border-action-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="surface-card flex items-center justify-between pb-6">
        <div>
          <p className="text-sm font-medium text-text-secondary mb-3">
            <Bell className="w-5 h-5 text-action-primary" />
            Notification Preferences
          </p>
          <p className="text-sm text-text-muted mt-1">
            Manage how and when you receive campus gate system alerts.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="surface-card flex items-center gap-2 px-5 py-2.5 bg-action-primary text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : savedSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-white" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : savedSuccess ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Channels */}
      <div className="surface-card bg-bg-surface p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Notification Channels</h2>
        <p className="text-xs text-text-muted">Select channels you want to receive alerts through.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <label className="surface-card flex items-center justify-between p-4 hover:bg-bg-elevated cursor-pointer">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-action-primary" />
              <div>
                <span className="text-sm font-medium text-text-primary block">Push Notifications</span>
                <span className="text-xs text-text-muted">Browser and mobile push</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.channels.push}
              onChange={() => handleChannelToggle('push')}
              className="w-4 h-4 accent-[var(--action-primary)]"
            />
          </label>

          <label className="surface-card flex items-center justify-between p-4 hover:bg-bg-elevated cursor-pointer">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-action-success" />
              <div>
                <span className="text-sm font-medium text-text-primary block">SMS Alerts</span>
                <span className="text-xs text-text-muted">Text messages for urgent events</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.channels.sms}
              onChange={() => handleChannelToggle('sms')}
              className="w-4 h-4 accent-[var(--action-primary)]"
            />
          </label>

          <label className="surface-card flex items-center justify-between p-4 hover:bg-bg-elevated cursor-pointer">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-unit-c" />
              <div>
                <span className="text-sm font-medium text-text-primary block">Email Summary</span>
                <span className="text-xs text-text-muted">Daily summaries and reports</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.channels.email}
              onChange={() => handleChannelToggle('email')}
              className="w-4 h-4 accent-[var(--action-primary)]"
            />
          </label>

          <label className="surface-card flex items-center justify-between p-4 hover:bg-bg-elevated cursor-pointer">
            <div className="flex items-center gap-3">
              <AppWindow className="w-5 h-5 text-action-warning" />
              <div>
                <span className="text-sm font-medium text-text-primary block">In-App Notifications</span>
                <span className="text-xs text-text-muted">Notification bell in header</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.channels.in_app}
              onChange={() => handleChannelToggle('in_app')}
              className="w-4 h-4 accent-[var(--action-primary)]"
            />
          </label>
        </div>
      </div>

      {/* Notification Categories */}
      <div className="surface-card bg-bg-surface p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Alert Categories</h2>
        <p className="text-xs text-text-muted">Enable or disable specific types of alerts.</p>

        <div className="space-y-3 pt-2">
          {Object.entries(prefs.types).map(([key, enabled]) => {
            const formattedLabel = key
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');

            return (
              <label
                key={key}
                className="surface-card flex items-center justify-between p-3 hover:bg-bg-elevated cursor-pointer"
              >
                <span className="text-sm font-medium text-text-primary">{formattedLabel}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => handleTypeToggle(key as any)}
                  className="w-4 h-4 accent-[var(--action-primary)]"
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="surface-card bg-bg-surface p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-action-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Quiet Hours</h2>
        </div>
        <p className="text-xs text-text-muted">Suppress non-critical notifications during these hours.</p>

        <div className="flex items-center gap-4 pt-2">
          <div>
            <label className="text-xs text-text-muted block mb-1" htmlFor="start-time">Start Time</label>
            <input id="start-time"
              type="time"
              value={prefs.quietHours?.start || "22:00"}
              onChange={(e) => setPrefs(prev => ({
                ...prev,
                quietHours: { start: e.target.value, end: prev.quietHours?.end || "06:00" }
              }))}
              className="surface-card bg-bg-elevated text-text-primary text-sm px-3 py-2"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted block mb-1" htmlFor="end-time">End Time</label>
            <input id="end-time"
              type="time"
              value={prefs.quietHours?.end || "06:00"}
              onChange={(e) => setPrefs(prev => ({
                ...prev,
                quietHours: { start: prev.quietHours?.start || "22:00", end: e.target.value }
              }))}
              className="surface-card bg-bg-elevated text-text-primary text-sm px-3 py-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
