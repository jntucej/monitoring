"use client";

import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";

/**
 * Caretaker maintenance queue — plumbing, electrical, and sanitation repair
 * requests scoped to the caller. Reuses the shared ComplaintConsole (same
 * component the EMO and Deputy Warden consoles use) instead of a bespoke
 * placeholder.
 */
export default function CaretakerMaintenancePage() {
  return (
    <ComplaintConsole role="caretaker" basePath="/caretaker/maintenance" title="Maintenance & Complaints" />
  );
}
