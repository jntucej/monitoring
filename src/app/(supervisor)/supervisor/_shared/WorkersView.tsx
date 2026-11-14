"use client";

import { useMemo, useState } from "react";
import { Users, ShieldCheck, HardHat, UtensilsCrossed, Car, Phone, MapPin, Search, X } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { ListSkeleton } from "./ListSkeleton";

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

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "security", label: "Security" },
  { id: "maintenance", label: "Maintenance" },
  { id: "canteen", label: "Canteen" },
  { id: "driver", label: "Drivers" },
  { id: "office_staff", label: "Office" },
  { id: "other", label: "Other" },
];

const ICONS: Record<string, typeof ShieldCheck> = {
  security: ShieldCheck,
  maintenance: HardHat,
  canteen: UtensilsCrossed,
  driver: Car,
  office_staff: Users,
  support_staff: Users,
  other: Users,
};

export function WorkersView() {
  const [category, setCategory] = useState("all");
  const [selectedGate, setSelectedGate] = useState("all");
  const [search, setSearch] = useState("");
  const [activeWorker, setActiveWorker] = useState<Worker | null>(null);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (selectedGate !== "all") params.set("gateId", selectedGate);
    const qs = params.toString();
    return `/api/supervisor/team-roster${qs ? `?${qs}` : ""}`;
  }, [category, selectedGate]);

  const { data, loading } = useApiResource<TeamRosterResponse>(url, { ttlMs: 15_000 });
  const workers = data?.data.workers ?? [];
  const totals = data?.data.totals;

  const gates = useMemo(() => {
    const set = new Map<string, string>();
    for (const w of workers) {
      if (w.gateId && w.gateName) set.set(w.gateId, w.gateName);
    }
    return Array.from(set.entries()).map(([id, name]) => ({ id, name }));
  }, [workers]);

  const filtered = useMemo(() => {
    return workers.filter((w) => {
      if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [workers, search]);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Workers & Security</h1>
          <p className="text-xs text-text-muted">
            Full roster of security guards, maintenance, and facility staff
          </p>
        </div>
        {totals && (
          <div className="flex gap-3 text-xs">
            <span className="surface-card bg-action-primary/10 px-3 py-1 font-medium text-action-primary">
              {totals.onPost} on post
            </span>
            <span className="surface-card bg-action-info/10 px-3 py-1 font-medium text-action-info">
              {totals.securityOnDuty} security
            </span>
            <span className="surface-card bg-action-danger/10 px-3 py-1 font-medium text-action-danger">
              {totals.absent} absent
            </span>
          </div>
        )}
      </header>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w50 flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search workers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="surface-card w-full min-h11 bg-bg-surface py-2 pl-9 pr-3 text-xs text-text-primary placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-action-primary"
          />
        </div>

        {gates.length > 0 && (
          <select
            value={selectedGate}
            onChange={(e) => setSelectedGate(e.target.value)}
            className="surface-card min-h11 bg-bg-surface px-3 py-2 text-xs text-text-primary focus:outline-none"
          >
            <option value="all">All Gates</option>
            {gates.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Category chips */}
      <div className="surface-card flex flex-wrap gap-1.5 pb-3">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`inline-flex min-h11 items-center rounded-full px-3 py-1 text-xs font-medium transition ${
              category === c.id
                ? "bg-action-primary text-white"
                : "bg-bg-surface text-text-secondary hover:bg-bg-elevated"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && filtered.length === 0 ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <div className="surface-card bg-bg-surface p-8 text-center text-xs text-text-muted">
          No workers match your filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-bg-surface">
          <ul className="divide-y divide-border">
            {filtered.map((w) => {
              const Icon = ICONS[w.staffCategory] ?? Users;
              const statusColor =
                w.status === "INSIDE"
                  ? "bg-action-primary"
                  : w.status === "OUTSIDE"
                  ? "bg-action-warning"
                  : "bg-action-danger";
              return (
                <li
                  key={w.id}
                  onClick={() => setActiveWorker(w)}
                  className="flex cursor-pointer items-center gap-3 p-3 text-xs transition hover:bg-bg-elevated"
                >
                  <span className={`size-4 shrink-0 rounded-full ${statusColor}`} />
                  <Icon className="size-4 shrink-0 text-text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text-primary">{w.name}</p>
                    <p className="text-xs text-text-muted">
                      {w.designation ?? w.staffCategory} {w.firstInTime && `· in at ${new Date(w.firstInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="surface-card flex items-center gap-1 bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">
                      <MapPin className="size-4" />
                      {w.gateName ?? "Unassigned"}
                    </span>
                    {w.phoneTail && (
                      <a
                        href={`tel:***${w.phoneTail}`}
                        onClick={(e) => e.stopPropagation()}
                        className="surface-card p-1.5 text-action-primary hover:bg-action-primary/10"
                        title={`Call ${w.name}`}
                      >
                        <Phone className="size-4" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Worker detail popup / side drawer */}
      {activeWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setActiveWorker(null)}
            aria-hidden="true"
          />
          <div className="surface-card relative z-10 w-full max-w-md bg-bg-surface p-6">
            <div className="surface-card mb-4 flex items-center justify-between pb-3">
              <div>
                <h3 className="text-base font-bold text-text-primary">{activeWorker.name}</h3>
                <p className="text-xs text-text-muted">{activeWorker.designation ?? activeWorker.staffCategory}</p>
              </div>
              <button
                onClick={() => setActiveWorker(null)}
                aria-label="Close"
                className="flex size-4 min-h11 min-w11 items-center justify-center rounded-lg text-text-muted hover:bg-bg-elevated"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-xs uppercase text-text-muted">Staff Category</p>
                <p className="font-medium text-text-primary">{activeWorker.staffCategory}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-text-muted">Assigned Gate</p>
                <p className="font-medium text-text-primary">{activeWorker.gateName ?? "Unassigned"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-text-muted">Status</p>
                <p className="font-medium text-text-primary">{activeWorker.status}</p>
              </div>
              {activeWorker.phoneTail && (
                <div className="pt-3">
                  <a
                    href={`tel:***${activeWorker.phoneTail}`}
                    className="surface-card flex min-h11 items-center justify-center gap-2 bg-action-primary py-2.5 font-medium text-white transition hover:bg-action-primary/90"
                  >
                    <Phone className="size-4" />
                    Call Worker (***{activeWorker.phoneTail})
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
