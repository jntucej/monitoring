export const dynamic = "force-dynamic";

// src/app/(admin)/admin/analytics/traffic/page.tsx
// SCAFFOLD:PAGE — thin wrapper around the TrafficAnalytics component.
import { TrafficAnalytics } from "@/components/admin/TrafficAnalytics";

export default function TrafficPage() {
  return <TrafficAnalytics />;
}
