import { find } from "@/server/repositories/alerts/find";

export async function listAlerts(searchParams: URLSearchParams) {
  const resolvedParam = searchParams.get("resolved");
  const resolved =
    resolvedParam === null ? undefined : resolvedParam === "true";
  const severity = searchParams.get("severity") ?? undefined;

  const alerts = await find({ resolved, severity });
  return { alerts };
}
