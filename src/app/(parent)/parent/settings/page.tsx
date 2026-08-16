import { Bell, User, Shield, Save } from "lucide-react";

export default function ParentSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[var(--text-muted)]">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-[var(--action-primary)]" />
            Profile
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Full Name</label>
              <input type="text" defaultValue="Parent Name" className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" defaultValue="parent@example.com" className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input type="tel" defaultValue="+91 98765 43210" className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-[var(--action-warning)]" />
            Notifications
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm">Child entry/exit alerts</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Pass request updates</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Emergency notifications</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-[var(--action-info)]" />
            Security
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Current PIN</label>
              <input type="password" placeholder="••••" className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm mb-1">New PIN</label>
              <input type="password" placeholder="••••" className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm" />
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