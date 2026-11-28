"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SchemaFormDrawer } from "@/components/student/SchemaFormDrawer";
import { WhatIfAttendanceSimulator } from "@/components/student/WhatIfAttendanceSimulator";
import { HallTicketGateCard } from "@/components/student/HallTicketGateCard";
import { ActivePassQrCard } from "@/components/student/ActivePassQrCard";
import {
  GraduationCap,
  Clock,
  IndianRupee,
  DoorOpen,
  Utensils,
  FileText,
  Shield,
} from "lucide-react";
import { useStudentState } from "@/hooks/useStudentState";
import { useCatalog } from "@/hooks/useCatalog";

/**
 * StudentDashboardShell — the catalog-driven, zero-hardcoded student hub.
 *
 * Rendered at /student:
 *   1. Hero KPI strip: Hall Ticket Gate · Attendance buffer · Next deadline · Dues
 *   2. Context-pinned card: Active Pass QR (hostellers) or Pre-Exam hero
 *   3. What-If Attendance Simulator
 *   4. Schema-driven action drawers (Outing Pass, Mess Rebate, Condonation, Statutory)
 *   5. Authority Bridge feed (official knowledge + private tickets)
 *
 * Nothing here hardcodes an institutional rule — every threshold, curfew,
 * fee slab, and form field reads from /api/config/catalog + /api/student/state.
 */

type ActionKey = "outing_pass" | "mess_rebate" | "condonation_appeal" | "statutory_grievance";

export function StudentDashboardShell() {
  const { state, loading, error } = useStudentState();
  const { catalog } = useCatalog();
  const [openDrawer, setOpenDrawer] = useState<ActionKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-text-secondary">
        Loading your campus state…
      </div>
    );
  }
  if (!state || error) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-text-secondary">
        No student state available ({error ?? "not loaded"}).
      </div>
    );
  }

  const { identity, academic, gate, authorityBridge } = state;
  const formKeys = catalog?.formSchemas?.map((f) => f.key) ?? [];

  const nextDeadline = gate.activePass
    ? new Date(gate.activePass.to).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const actions: Array<{
    key: ActionKey;
    label: string;
    icon: React.ReactNode;
    available: boolean;
  }> = [
    { key: "outing_pass", label: "Request Outing Pass", icon: <DoorOpen className="h-4 w-4" />, available: formKeys.includes("outing_pass") && identity.isResidential },
    { key: "mess_rebate", label: "Apply Mess Rebate", icon: <Utensils className="h-4 w-4" />, available: formKeys.includes("mess_rebate") && identity.isResidential },
    { key: "condonation_appeal", label: "Condonation Appeal", icon: <FileText className="h-4 w-4" />, available: formKeys.includes("condonation_appeal") },
    { key: "statutory_grievance", label: "Statutory Grievance", icon: <Shield className="h-4 w-4" />, available: formKeys.includes("statutory_grievance") },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      {/* ── Identity + regulation chip ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-text-primary">
          {identity.name}
          {identity.rollNo ? ` · ${identity.rollNo}` : ""}
        </h1>
        <Badge variant="entry" dot={false}>
          {identity.regulationId ?? "No regulation"} · {identity.branch ?? "—"} ·{" "}
          {identity.section ?? "—"}
        </Badge>
        {identity.isResidential && (
          <Badge variant="leave" dot={false}>
            Hosteller
          </Badge>
        )}
        {gate.campusStatus && (
          <Badge variant={gate.campusStatus === "INSIDE" ? "success" : "dayout"} dot={false}>
            On campus: {gate.campusStatus}
          </Badge>
        )}
      </div>

      {/* ── Hero KPI strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HallTicketGateCard state={state} />
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-text-secondary" />
              Attendance buffer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {academic.hasAttendanceData ? (
              <div className="text-sm text-text-secondary">
                <span className="text-2xl font-semibold text-text-primary">
                  {academic.aggregatePct}%
                </span>{" "}
                ({academic.attendedClasses}/{academic.totalClasses} classes)
                <p className="mt-2 text-xs">
                  {academic.aggregatePct != null &&
                  catalog?.examEligibility.eligibleMinPct != null
                    ? academic.aggregatePct >= catalog.examEligibility.eligibleMinPct
                      ? "Above the safe threshold."
                      : "Below the safe threshold — see the simulator below."
                    : "No threshold configured."}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No attendance data yet.</p>
            )}
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-text-secondary" />
              Next deadline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextDeadline ? (
              <div className="text-sm text-text-secondary">
                <span className="text-lg font-semibold text-text-primary">{nextDeadline}</span>
                <p className="mt-1 text-xs">Active pass curfew / return window.</p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No active deadline.</p>
            )}
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IndianRupee className="h-4 w-4 text-text-secondary" />
              Dues &amp; mess balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {academic.duesBalanceInr != null ? (
              <div className="text-sm text-text-secondary">
                <span
                  className={
                    "text-2xl font-semibold " +
                    (academic.duesBalanceInr > 0 ? "text-rose-600" : "text-emerald-600")
                  }
                >
                  ₹{academic.duesBalanceInr.toLocaleString("en-IN")}
                </span>
                <p className="mt-1 text-xs">
                  {academic.duesBalanceInr > 0 ? "outstanding" : "cleared"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Not computed yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Context-pinned card (active pass) ─────────────────────── */}
      {gate.activePass && <ActivePassQrCard state={state} />}

      {/* ── What-If Attendance Simulator ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What-If: attendance impact on hall ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <WhatIfAttendanceSimulator state={state} />
        </CardContent>
      </Card>

      {/* ── Action drawers (schema-driven) ────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Start a request</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {actions
              .filter((a) => a.available)
              .map((a) => (
                <Button
                  key={a.key}
                  variant="secondary"
                  size="sm"
                  onClick={() => setOpenDrawer(a.key)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {a.icon}
                    {a.label}
                  </span>
                </Button>
              ))}
            {actions.every((a) => !a.available) && (
              <p className="text-sm text-text-secondary">No forms registered in the catalog yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Authority Bridge feed ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Authority Bridge — official knowledge</CardTitle>
        </CardHeader>
        <CardContent>
          {authorityBridge.classFeedItems.length === 0 ? (
            <p className="text-sm text-text-secondary">No pinned official answers yet.</p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
              {authorityBridge.classFeedItems.map((item) => (
                <li key={item.id} className="rounded-lg border border-border bg-bg-elevated p-3 text-sm">
                  {item.constraintTag && (
                    <Badge variant="entry" dot={false} className="mb-1.5">
                      {item.constraintTag}
                    </Badge>
                  )}
                  {item.superseded && (
                    <Badge variant="error" dot={false} className="mb-1.5 ml-2">
                      SUPERSEDED
                    </Badge>
                  )}
                  <p className="text-text-primary">{item.body}</p>
                </li>
              ))}
            </ul>
          )}

          {authorityBridge.privateTickets.length > 0 && (
            <>
              <h3 className="mt-5 mb-2 text-sm font-medium text-text-secondary">
                Private tickets (sensitive, not shown in class feed)
              </h3>
              <ul className="flex flex-col gap-2">
                {authorityBridge.privateTickets.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm"
                  >
                    <span className="text-text-primary">{t.title}</span>
                    <Badge variant={t.status === "OPEN" ? "leave" : "offline"} dot={false}>
                      {t.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Schema drawer (single renderer for all forms) ────────── */}
      <SchemaFormDrawer
        formKey={openDrawer ?? "outing_pass"}
        open={openDrawer !== null}
        onClose={() => setOpenDrawer(null)}
        state={state}
        onSubmitted={(key, values) => {
          setToast(`Submitted ${key}. Ticket created — track it in Requests.`);
          setTimeout(() => setToast(null), 5_000);
          void values;
        }}
      />

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
