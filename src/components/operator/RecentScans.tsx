"use client";
import { User, ArrowRight, ArrowLeft } from "lucide-react";
import { parseRollNumber } from "@/lib/rollNumber";

const DUMMY_SCANS = [
  { id: 1, name: "Akarsh Jadi",   roll: "24JJ1A0501",  status: "entry", time: "10:30 AM" },
  { id: 2, name: "Bhavana",        roll: "24JJ1A0508",  status: "exit",  time: "10:32 AM" },
  { id: 3, name: "Chandu",         roll: "24JJ1A1215",  status: "entry", time: "10:35 AM" },
  { id: 4, name: "Dhana",          roll: "24JJ1A0322",  status: "entry", time: "10:38 AM" },
  { id: 5, name: "Eshwar",         roll: "24JJ1A0429",  status: "exit",  time: "10:40 AM" },
];

const SCANS_WITH_DEPT = DUMMY_SCANS.map((s) => {
  const decoded = parseRollNumber(s.roll);
  return { ...s, department: decoded?.department ?? "??" };
});

export function RecentScans() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Recent Scans</h3>
      <div className="space-y-4">
        {SCANS_WITH_DEPT.map((scan) => (
          <div key={scan.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${scan.status === 'entry' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">{scan.name}</p>
                <p className="text-sm text-[var(--text-muted)] font-mono">
                  {scan.roll}
                  <span className="ml-1.5 text-xs font-medium text-[var(--text-secondary)]">[{scan.department}]</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-1.5 text-sm font-medium ${scan.status === 'entry' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {scan.status === 'entry' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                <span>{scan.status === 'entry' ? 'Entry' : 'Exit'}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{scan.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
