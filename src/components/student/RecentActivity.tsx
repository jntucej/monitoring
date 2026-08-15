"use client";
import { ArrowRight, ArrowLeft } from "lucide-react";

const DUMMY_ACTIVITY = [
  { id: 1, type: "entry", time: "Mon, 10:30 AM", gate: "Gate 1" },
  { id: 2, type: "exit", time: "Mon, 5:00 PM", gate: "Gate 1" },
  { id: 3, type: "entry", time: "Tue, 9:00 AM", gate: "Gate 2" },
  { id: 4, type: "exit", time: "Tue, 4:30 PM", gate: "Gate 2" },
];

export function RecentActivity() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {DUMMY_ACTIVITY.map((activity) => (
          <div key={activity.id} className="flex items-center justify-between">
            <div className={`flex items-center gap-2 font-medium ${activity.type === 'entry' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {activity.type === 'entry' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span className="capitalize">{activity.type}</span>
            </div>
            <div className="text-right">
              <p className="text-sm">{activity.time}</p>
              <p className="text-xs text-[var(--text-muted)]">{activity.gate}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
