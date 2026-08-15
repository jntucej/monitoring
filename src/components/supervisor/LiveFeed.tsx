"use client";
import { User, ArrowRight, ArrowLeft } from "lucide-react";

const DUMMY_EVENTS = [
  { id: 1, name: "Akarsh Jadi", roll: "2101CS02", status: "entry", time: "10:30 AM", gate: "Gate 1" },
  { id: 2, name: "Bhavana", roll: "2101CS08", status: "exit", time: "10:32 AM", gate: "Gate 2" },
  { id: 3, name: "Chandu", roll: "2101CS15", status: "entry", time: "10:35 AM", gate: "Gate 1" },
  { id: 4, name: "Dhana", roll: "2101CS22", status: "entry", time: "10:38 AM", gate: "Gate 1" },
  { id: 5, name: "Eshwar", roll: "2101CS29", status: "exit", time: "10:40 AM", gate: "Gate 2" },
  { id: 6, name: "Fathima", roll: "2101CS31", status: "entry", time: "10:42 AM", gate: "Gate 1" },
  { id: 7, name: "Ganesh", roll: "2101CS35", status: "exit", time: "10:45 AM", gate: "Gate 2" },
];

export function LiveFeed() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-semibold">Live Gate Events</h3>
      </div>
      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {DUMMY_EVENTS.map((event) => (
          <div key={event.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${event.status === 'entry' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">{event.name}</p>
                <p className="text-sm text-[var(--text-muted)]">{event.roll}</p>
              </div>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-1.5 text-sm font-medium ${event.status === 'entry' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {event.status === 'entry' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                <span>{event.status === 'entry' ? 'Entry' : 'Exit'}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{event.time} at {event.gate}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
