import { redirect } from "next/navigation";
import { getAllGatesLive } from "@/lib/db";

export default async function OperatorHome() {
  // /operator is the operator's home. If a specific gate is assigned to the
  // session (payload.gateId) the proxy already routes them to /gate/<id>;
  // this page is the fallback when that is not set. Pick the first active
  // gate so the operator still lands somewhere useful instead of a 404.
  const gates = await getAllGatesLive().catch(() => [] as Array<{ id: string } | null>);
  const target = gates.find((g) => g?.id);
  if (target) redirect(`/gate/${target.id}`);
  redirect("/operator/transactions");
}
