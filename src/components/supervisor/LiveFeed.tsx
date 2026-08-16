"use client";
import { User, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { parseRollNumber } from "@/lib/rollNumber";

// This type definition should match the API contract
type GateEvent = {
  id: string;
  student: {
    name: string;
    rollNumber: string;
    avatarUrl?: string | null;
  };
  eventType: "entry" | "exit";
  timestamp: string;
  gate: {
    id: string;
    name: string;
  };
};

// Decode a roll number into its semantic parts (department, entry mode, year)
function rollSummary(roll: string): string | null {
  const d = parseRollNumber(roll);
  if (!d) return null;
  return `${d.department} • ${d.entryMode} • ${d.admissionYear}`;
}

function SkeletonLoader() {
  return (
    <div className="p-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse" />
            <div>
              <div className="h-4 w-24 bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-3 w-16 bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
          <div className="text-right">
            <div className="h-4 w-20 bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-28 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveFeed() {
  const [events, setEvents] = useState<GateEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/supervisor/live-events');
        if (!response.ok) {
          throw new Error('Failed to fetch live events.');
        }
        const data = await response.json();
        setEvents(data);
      } catch (e: any) {
        setError(e.message || "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvents();
  }, []);

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-semibold">Live Gate Events</h3>
      </div>
      
      {isLoading && <SkeletonLoader />}

      {error && (
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <h4 className="font-semibold text-lg">Could not load events</h4>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {events.map((event) => {
            const rollInfo = rollSummary(event.student.rollNumber);
            return (
              <div key={event.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${event.eventType === 'entry' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {/* Placeholder for avatar image */}
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{event.student.name}</p>
                    <p className="text-sm text-[var(--text-muted)] font-mono">{event.student.rollNumber}</p>
                    {rollInfo && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{rollInfo}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center justify-end gap-1.5 text-sm font-medium ${event.eventType === 'entry' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {event.eventType === 'entry' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                    <span className="capitalize">{event.eventType}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]" title={new Date(event.timestamp).toLocaleString()}>
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })} at {event.gate.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
