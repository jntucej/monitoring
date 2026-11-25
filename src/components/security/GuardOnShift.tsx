"use client";

import { useCallback, useEffect, useState } from "react";
import { SosInbox, type OfferedDispatch } from "./SosInbox";
import { SosResponder } from "./SosResponder";

export function GuardOnShift() {
  const [shiftInfo, setShiftInfo] = useState<{ post_kind: string; gate_id: string | null } | null>(null);
  const [dispatches, setDispatches] = useState<Array<OfferedDispatch & { status: string }>>([]);

  const loadDispatches = useCallback(() => {
    fetch("/api/sos/me")
      .then((r) => r.json())
      .then((j) => setDispatches(j?.data?.dispatches ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadDispatches();
    const id = setInterval(loadDispatches, 5000);
    return () => clearInterval(id);
  }, [loadDispatches]);

  useEffect(() => {
    const ping = () => {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            fetch("/api/security/ping", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy_m: Math.round(pos.coords.accuracy),
              }),
            })
              .then((r) => r.json())
              .then((j) => {
                if (j?.data?.post_kind) setShiftInfo(j.data);
              })
              .catch(() => {});
          },
          () => {},
        );
      }
    };
    ping();
    const id = setInterval(ping, 30_000);
    return () => clearInterval(id);
  }, []);

  const offered = dispatches.find((d) => d.status === "offered");
  const active = dispatches.find((d) => ["accepted", "en_route", "on_scene"].includes(d.status));

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-2 text-sm text-foreground">
        {shiftInfo
          ? shiftInfo.post_kind === "gate"
            ? `On shift: Gate Post (${shiftInfo.gate_id ?? "assigned"})`
            : `On shift: ${shiftInfo.post_kind} — no gate scan`
          : "Shift status: awaiting GPS ping / check-in"}
      </div>

      {offered && <SosInbox offer={offered} onUpdated={loadDispatches} />}
      {active && (
        <SosResponder
          sosId={active.sos_id}
          dispatchId={active.id}
          status={active.status}
          onUpdated={loadDispatches}
        />
      )}
    </div>
  );
}
