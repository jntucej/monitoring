import { Settings, Bell, Shield, Database, Save } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[var(--text-muted)]">Configure system preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-[var(--action-warning)]" />
            Notification Settings
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm">Email alerts for gate anomalies</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">SMS alerts for unauthorized access</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Push notifications for supervisors</span>
              <input type="checkbox" className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-[var(--action-info)]" />
            Security Settings
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm">Two-factor authentication</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Session timeout (30 min)</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">IP whitelisting</span>
              <input type="checkbox" className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-[var(--action-primary)]" />
            Data Management
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm">Automatic daily backups</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Retention period (90 days)</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-[var(--action-warning)]" />
            General Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">College Name</label>
              <input type="text" defaultValue="JNTUH University College of Engineering" className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm mb-1">Default Gate</label>
              <select className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm">
                <option>Gate 1 (Main)</option>
                <option>Gate 2 (Hostel)</option>
                <option>Gate 3 (Back Gate)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--action-primary)] text-white font-medium hover:brightness-110">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}