import type { LucideIcon } from "lucide-react";
import { ShieldCheck, Footprints, Ticket, DoorOpen } from "lucide-react";

export interface StudentWidget {
  id: string;
  title: string;
  icon: LucideIcon;
  apiField: string;
  ttlMs: number;
  order: number;
  // SCAFFOLD:WIDGETS — new widgets are injected above this line
}

export const STUDENT_WIDGETS: StudentWidget[] = [
  { id: "curfew",   title: "Curfew Score",   icon: ShieldCheck, apiField: "curfew",       ttlMs: 20_000, order: 1 },
  { id: "monthly",  title: "Monthly Outing", icon: Footprints,  apiField: "monthly",      ttlMs: 20_000, order: 2 },
  { id: "passes",   title: "Active Passes",  icon: Ticket,      apiField: "activePasses", ttlMs: 20_000, order: 3 },
  { id: "lastscan", title: "Last Gate Scan", icon: DoorOpen,    apiField: "lastScan",     ttlMs: 20_000, order: 4 },
];
