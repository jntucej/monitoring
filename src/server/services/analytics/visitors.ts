import { find } from "@/server/repositories/visitor-logs/find";
import { VisitorAnalytics } from "@/lib/analytics-types";

export async function getVisitorAnalytics(range: { from: string; to: string }): Promise<VisitorAnalytics> {
  const logs = await find(range.from, range.to);

  const analytics: VisitorAnalytics = {
    totalVisitors: 0,
    uniqueVisitors: 0,
    averageStayHours: 0,
    peakVisitDays: [],
    topHosts: [],
    purposes: [],
  };

  const uniqueIds = new Set();
  const hostCounts: Record<string, number> = {};
  const dayCounts: Record<string, number> = {};
  const purposeCounts: Record<string, number> = {};
  let totalStayHours = 0;

  for (const log of logs) {
    analytics.totalVisitors++;
    uniqueIds.add(log.person_id);

    if (log.host_person_id) {
      hostCounts[log.host_person_id] = (hostCounts[log.host_person_id] || 0) + 1;
    }

    if (log.check_in_at) {
      const day = new Date(log.check_in_at).toLocaleDateString("en-US", { weekday: "long" });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }

    if (log.purpose) {
      purposeCounts[log.purpose] = (purposeCounts[log.purpose] || 0) + 1;
    }

    if (log.check_out_at && log.check_in_at) {
      const hours = (new Date(log.check_out_at).getTime() - new Date(log.check_in_at).getTime()) / (1000 * 60 * 60);
      totalStayHours += Math.max(0, hours);
    }
  }

  analytics.uniqueVisitors = uniqueIds.size;
  analytics.averageStayHours = analytics.totalVisitors > 0 ? totalStayHours / analytics.totalVisitors : 0;

  analytics.topHosts = Object.entries(hostCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
  analytics.peakVisitDays = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]).map(([day, count]) => ({ day, count }));
  analytics.purposes = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1]).map(([purpose, count]) => ({ purpose, count }));

  return analytics;
}
