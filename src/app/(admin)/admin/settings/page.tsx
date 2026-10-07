import { Bell, Shield, Database, Component } from "lucide-react";
import { CollegeInfoForm } from "./CollegeInfoForm";
import { PassTypesForm } from "./PassTypesForm";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[var(--text-muted)]">Configure dynamic system preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CollegeInfoForm />
        
        <PassTypesForm />

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 col-span-1 lg:col-span-2">
          <h3 className="font-semibold flex items-center gap-2 mb-4 text-emerald-400">
            <Component className="w-5 h-5" />
            More dynamic config forms coming soon...
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            As part of settings modernization, exit reasons, roles, and UI configurations will map here.
          </p>
        </div>
      </div>
    </div>
  );
}
