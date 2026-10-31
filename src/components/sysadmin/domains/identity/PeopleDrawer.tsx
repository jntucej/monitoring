"use client";
// src/components/sysadmin/domains/identity/PeopleDrawer.tsx
// PEOPLE drawer: right-hand panel with sections profile / roles / sessions /
// audit / links. Opens on row click (no route change); fetches the single
// person detail from /api/admin/people/<id> via ok() + query (not Supabase).
// "use client"; CSS vars only; cn from @/lib/utils.

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PersonDetail,
  PersonRow,
} from "@/components/sysadmin/domains/identity/types";

interface Props {
  /** The row that was clicked; drives which person to fetch. Null = closed. */
  row?: PersonRow | null;
  /** Sibling-surface convenience: open by id only (a minimal PersonRow is built). */
  personId?: string | null;
  onClose: () => void;
}

type LoadState = "idle" | "loading" | "ready" | "error";

export function PeopleDrawer({ row, personId, onClose }: Props) {
  // Normalize to a single "active" row: prefer `row`; else build one from
  // `personId` (sibling pages that pass only the id).
  const activeRow = row ?? (personId ? { id: personId } as PersonRow : null);
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeRow) {
      setDetail(null);
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    setError(null);
    fetch(`/api/admin/people/${encodeURIComponent(activeRow.id)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setDetail(json.data as PersonDetail);
        setState("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load");
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [activeRow?.id, activeRow]);

  useEffect(() => {
    if (!activeRow) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeRow, onClose]);

  if (!activeRow) return null;

  const d = detail;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 h-full w-full cursor-default bg-black/30"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Person detail: ${d?.name ?? activeRow.name ?? activeRow.id}`}
        className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-[var(--border)] bg-[var(--surface-default)] shadow-xl"
      >
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-default)] px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-[var(--text-primary)]">
              {d?.name ?? activeRow.name}
            </div>
            <div className="truncate text-xs text-[var(--text-muted)]">
              {d?.email ?? activeRow.email}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {state === "loading" && (
            <div className="space-y-2">
              <div className="h-3 w-32 animate-pulse rounded bg-[var(--surface-raised)]" />
              <div className="h-24 animate-pulse rounded bg-[var(--surface-raised)]" />
            </div>
          )}
          {state === "error" && (
            <div className="rounded-md border border-[var(--action-danger)] bg-[var(--action-danger)]/10 p-3 text-sm text-[var(--action-danger)]">
              {error}
            </div>
          )}

          {state === "ready" && d && (
            <>
              {/* PROFILE */}
              <Section title="Profile">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <Field k="Role" v={d.role} />
                  <Field k="State" v={d.state} />
                  <Field k="Phone" v={d.phone ?? "—"} />
                  <Field
                    k="Pw changed"
                    v={
                      d.last_password_change
                        ? new Date(d.last_password_change).toLocaleDateString()
                        : "—"
                    }
                  />
                  <Field k="Created" v={new Date(d.created_at).toLocaleDateString()} />
                </dl>
              </Section>

              {/* ROLES */}
              <Section title={`Roles (${d.roles.length})`}>
                <ul className="space-y-1">
                  {d.roles.map((r) => (
                    <li
                      key={r.role}
                      className="flex items-center justify-between rounded border border-[var(--border)] px-2 py-1 text-sm"
                    >
                      <span className="text-[var(--text-primary)]">{r.role}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(r.granted_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                  {d.roles.length === 0 && (
                    <li className="text-sm text-[var(--text-muted)]">No roles recorded.</li>
                  )}
                </ul>
              </Section>

              {/* SESSIONS */}
              <Section title={`Sessions (${d.sessionsCount})`}>
                {d.sessions.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No sessions.</p>
                ) : (
                  <ul className="space-y-1">
                    {d.sessions.map((s) => (
                      <li
                        key={s.id}
                        className={cn(
                          "rounded border px-2 py-1 text-xs",
                          s.revoked_at
                            ? "border-[var(--border)] text-[var(--text-muted)]"
                            : "border-[var(--action-ok)]/40 text-[var(--text-primary)]",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{s.revoked_at ? "Revoked" : "Active"}</span>
                          <span className="font-mono">{s.ip_address ?? "—"}</span>
                        </div>
                        <div className="truncate text-[var(--text-muted)]">
                          {s.user_agent ?? "unknown agent"}
                        </div>
                        <div className="text-[var(--text-muted)]">
                          seen{" "}
                          {s.last_seen_at
                            ? new Date(s.last_seen_at).toLocaleString()
                            : "—"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {/* AUDIT */}
              <Section title="Recent audit">
                {d.audit.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No audit entries.</p>
                ) : (
                  <ul className="space-y-1">
                    {d.audit.map((a, i) => (
                      <li key={i} className="text-xs">
                        <span className="font-medium text-[var(--text-primary)]">
                          {a.action}
                        </span>{" "}
                        <span className="text-[var(--text-muted)]">
                          · {new Date(a.timestamp).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {/* LINKS */}
              <Section title="Links">
                <ul className="flex flex-wrap gap-2">
                  <DrawerLink href={d.links.users}>User record</DrawerLink>
                  <DrawerLink href={d.links.userRoles}>Roles</DrawerLink>
                  <DrawerLink href={d.links.roleRequests}>Role requests</DrawerLink>
                  <DrawerLink href={d.links.auditLogs}>Audit logs</DrawerLink>
                </ul>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Local helpers ────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] text-[var(--text-muted)]">{k}</dt>
      <dd className="text-[var(--text-primary)]">{v}</dd>
    </div>
  );
}

function DrawerLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)] hover:border-[var(--action-primary)] hover:text-[var(--action-primary)]"
    >
      {children}
    </a>
  );
}
