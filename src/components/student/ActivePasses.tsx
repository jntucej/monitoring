"use client";
import { Ticket } from "lucide-react";

const DUMMY_PASSES = [
  { id: 1, type: "Day Pass", expiry: "Expires in 6 hours" },
  { id: 2, type: "Weekend Pass", expiry: "Expires on Sunday 8:00 PM" },
];

export function ActivePasses() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Active Passes</h3>
      <div className="space-y-4">
        {DUMMY_PASSES.map((pass) => (
          <div key={pass.id} className="flex items-center gap-4 p-3 bg-blue-500/10 rounded-lg">
            <Ticket className="w-8 h-8 text-blue-400" />
            <div>
              <p className="font-medium text-blue-300">{pass.type}</p>
              <p className="text-sm text-blue-400/80">{pass.expiry}</p>
            </div>
          </div>
        ))}
         {DUMMY_PASSES.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">No active passes.</p>
        )}
      </div>
    </div>
  );
}
