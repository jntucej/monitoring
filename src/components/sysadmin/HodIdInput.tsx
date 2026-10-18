"use client";
import { useEffect, useState } from "react";
import { Search, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface LookupResult {
  found: boolean;
  id?: string;
  name?: string;
  uniqueId?: string;
  roll?: string | null;
  employeeId?: string | null;
  role?: string;
  status?: string;
  department?: { code: string; name: string } | null;
  isHodOfDepartment?: string | null;
  eligible?: boolean;
  reason?: string;
  willTransferFrom?: { code: string; name: string } | null;
}

type State =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ready"; result: LookupResult }
  | { kind: "error"; message: string };

export function HodIdInput({
  value,
  onChange,
  onResolved,
}: {
  value: string;
  onChange: (raw: string) => void;
  onResolved: (userId: string | null) => void;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    if (!value.trim()) {
      setState({ kind: "idle" });
      onResolved(null);
      return;
    }
    let cancelled = false;
    setState({ kind: "checking" });
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/lookup?id=${encodeURIComponent(value.trim())}`,
          { headers: { "Content-Type": "application/json" } }
        );
        const json: LookupResult = await res.json();
        if (cancelled) return;
        setState({ kind: "ready", result: json });
        onResolved(json.found && json.eligible ? json.id! : null);
      } catch (e) {
        if (!cancelled) {
          setState({ kind: "error", message: "Lookup failed" });
          onResolved(null);
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, onResolved]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter roll number, employee ID, unique ID, or email"
          className="w-full rounded-lg border bg-background py-2 pl-9 pr-10 text-sm outline-none focus:border-primary"
        />
        {state.kind === "checking" && (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
      </div>

      {state.kind === "ready" && <LookupBanner result={state.result} />}
      {state.kind === "error" && (
        <p className="text-xs text-destructive">{state.message}</p>
      )}
    </div>
  );
}

function LookupBanner({ result }: { result: LookupResult }) {
  if (!result.found) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-medium">Not found</div>
          <div className="text-xs">{result.reason}</div>
        </div>
      </div>
    );
  }

  if (result.eligible === false) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 px-3 py-2 text-sm text-orange-400">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-medium">
            {result.name} <span className="opacity-70">· {result.role}</span>
          </div>
          <div className="text-xs">{result.reason}</div>
        </div>
      </div>
    );
  }

  if (result.willTransferFrom) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-sm text-blue-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-medium">{result.name}</div>
          <div className="text-xs">
            Currently HOD of{" "}
            <strong>{result.willTransferFrom.name}</strong>. Saving will transfer
            the HOD role to this department.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-400">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-medium">
          {result.name}
          <span className="ml-2 text-xs font-normal opacity-70">
            {result.role}
            {result.department ? ` · ${result.department.name}` : ""}
          </span>
        </div>
        <div className="text-xs">
          {result.roll && <>Roll: {result.roll} · </>}
          {result.employeeId && <>Emp ID: {result.employeeId} · </>}
          Unique ID: {result.uniqueId}
        </div>
      </div>
    </div>
  );
}
