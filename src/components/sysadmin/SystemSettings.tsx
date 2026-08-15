"use client";
import { Bell, ShieldCheck } from "lucide-react";

export function SystemSettings() {
    return (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="font-semibold mb-4">System Settings</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Notification Settings</p>
                        <p className="text-sm text-gray-400">Configure alert triggers and channels.</p>
                    </div>
                    <button className="text-sm font-medium text-sky-400 hover:underline">Manage</button>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Security Policies</p>
                        <p className="text-sm text-gray-400">Define password strength and session timeouts.</p>
                    </div>
                    <button className="text-sm font-medium text-sky-400 hover:underline">Manage</button>
                </div>
                 <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Data Backup</p>
                        <p className="text-sm text-gray-400">Manage automated data backup and restore points.</p>
                    </div>
                    <button className="text-sm font-medium text-sky-400 hover:underline">Manage</button>
                </div>
            </div>
        </div>
    );
}
