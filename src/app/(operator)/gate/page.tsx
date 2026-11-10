import { redirect } from "next/navigation";

// /gate is not a leaf route — the operator kiosk lives at /gate/[gateId]
// (assigned gate) or /operator (gate picker when unassigned). A bare /gate
// visit should land on the picker, not 404.
export default function GateRoot() {
  redirect("/operator");
}
