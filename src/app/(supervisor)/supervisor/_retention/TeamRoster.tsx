"use client";

import Link from "next/link";
import { Users, ShieldCheck, HardHat, UtensilsCrossed, Car, Phone, MapPin } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { Skeleton } from "@/components/ui/skeleton";

interface Worker {
  id: string;
  name: string;
  role: string;
  staffCategory: string;
  designation: string | null;
  gateId: string | null;
  gateName: string | null;
  status: "INSIDE" | "OUTSIDE" | "ABSENT";
  firstInTime: string | null;
  photoUrl: string | null;
  phoneTail: string | null;
}

interface TeamRosterResponse {
  data: {
    workers: Worker[];
    groups: Array<{ category: string; count: number; onPost: number }>;
    totals: { total: number; onPost: number; absent: number; securityOnDuty: number };
  };
}

const ICONS: Record<string, typeof ShieldCheck> = {
  security: ShieldCheck,
  maintenance: HardHat,
  canteen: UtensilsCrossed,
  driver: Car,
  office_staff: Users,
  support_staff: Users,
  other: Users,
};

const LABELS: Record<string, string> = {
  security: "Security",
  maintenance: "Maintenance",
  canteen: "Canteen",
  driver: "Drivers",
  office_staff: "Office",
  support_staff: "Support",
  other: "Other",
};

export function TeamRoster() {
  const { data, loading } = useApiResource<TeamRosterResponse>(
    "/api/supervisor/team-roster",
    { ttlMs: 30_000 }
  );

  const workers = data?.data.workers ?? [];
  const totals = data?.data.totals;
  const absent = workers.filter((w) => w.status === "ABSENT");
  const byGate = new Map<string, Worker[]>();
  for (const w of workers) {
    const g = w.gateName ?? "Unassigned";
    if (!byGate.has(g)) byGate.set(g, []);
    byGate.get(g)!.push(w);
  }

  return (
    <section className="surface-card bg-bg-surface p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-action-info" />
          <h2 className="text-sm font-semibold text-text-primary">
            Team roster
          </h2>
        </div>
        <Link
          href="/supervisor/team/workers"
          className="text-xs text-action-primary hover:underline"
        >
          Full roster →
        </Link>
      </header>

      {loading && !totals ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <>
          {/* Summary strip */}
          <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-text-muted">
                On post
              </p>
              <p className="text-lg font-semibold tabular-nums text-action-primary">
                {totals?.onPost ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-text-muted">
                Security on duty
              </p>
              <p className="text-lg font-semibold tabular-nums text-action-info">
                {totals?.securityOnDuty ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-text-muted">
                Absent
              </p>
              <p className="text-lg font-semibold tabular-nums text-action-danger">
                {totals?.absent ?? 0}
              </p>
            </div>
          </div>

          {/* Absent alert */}
          {absent.length > 0 && (
            <div className="surface-card mb-3 bg-action-danger/10 px-3 py-2 text-xs">
              <p className="font-medium text-action-danger">
                {absent.length} not accounted for
              </p>
              <p className="text-xs text-text-muted">
                {absent.slice(0, 3).map((w) => w.name).join(", ")}
                {absent.length > 3 && ` +${absent.length - 3} more`}
              </p>
            </div>
          )}

          {/* Grouped by gate */}
          <div className="space-y-2">
            {Array.from(byGate.entries()).slice(0, 4).map(([gate, rows]) => (
              <div key={gate} className="surface-card bg-bg-base/30 p-2">
                <div className="mb-1 flex items-center gap-1.5">
                  <MapPin className="size-3 text-text-muted" />
                  <span className="text-xs font-medium text-text-primary">{gate}</span>
                  <span className="text-xs text-text-muted">
                    {rows.filter((r) => r.status === "INSIDE").length}/{rows.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {rows.slice(0, 4).map((w) => {
                    const Icon = ICONS[w.staffCategory] ?? Users;
                    const statusColor =
                      w.status === "INSIDE"
                        ? "bg-action-primary"
                        : w.status === "OUTSIDE"
                        ? "bg-action-warning"
                        : "bg-action-danger";
                    return (
                      <li key={w.id} className="flex items-center gap-2 text-xs">
                        <span className={`size-1.5 shrink-0 rounded-full ${statusColor}`} />
                        <Icon className="size-3 text-text-muted" />
                        <span className="truncate font-medium text-text-primary">
                          {w.name}
                        </span>
                        <span className="ml-auto text-xs text-text-muted">
                          {LABELS[w.staffCategory] ?? w.staffCategory}
                        </span>
                        {w.phoneTail && (
                          <a
                            href={`tel:***${w.phoneTail}`}
                            className="text-action-primary hover:underline"
                            aria-label={`Call ${w.name}`}
                          >
                            <Phone className="size-3" />
                          </a>
                        )}
                      </li>
                    );
                  })}
                  {rows.length > 4 && (
                    <li className="text-xs text-text-muted">
                      +{rows.length - 4} more
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
