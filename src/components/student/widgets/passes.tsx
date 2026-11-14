"use client";
import { Ticket } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import type { StudentWidgetProps } from "./index";

export interface PassItem {
  id: string; reason: string; from: string; to: string; status: string; qrCode: string;
}

export default function PassesCard({ payload }: StudentWidgetProps) {
  const passes = (payload.activePasses as PassItem[]) ?? [];
  return (
    <article className="surface-card bg-bg-surface p-5">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Active Passes</h3>
        <span className="surface-card bg-action-primary/10 px-2 py-0.5 text-xs font-medium text-action-primary">
          {passes.length}
        </span>
      </header>
      {passes.length === 0 ? (
        <EmptyState title="No active passes" description="Request a Home Out or Day Pass from the Passes tab." />
      ) : (
        <ul className="space-y-2">
          {passes.map((p) => (
            <li key={p.id} className="surface-card p-3">
              <div className="flex items-start gap-3">
                <div className="surface-card bg-action-primary/10 p-2 text-action-primary">
                  <Ticket className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.reason}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {new Date(p.from).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {" → "}
                    {new Date(p.to).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
