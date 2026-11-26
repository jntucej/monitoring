"use client";

import { useHodRetention } from "@/stores/hodRetentionStore";
import { WinFeedBase } from "@/components/shared/retention/WinFeedBase";

export function WinFeed() {
  const sessionWins = useHodRetention((s) => s.sessionWins);
  const todayWins = useHodRetention((s) => s.todayWins);
  return <WinFeedBase sessionWins={sessionWins} todayWins={todayWins} />;
}
