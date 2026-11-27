"use client";

import { useVPRetention } from "@/stores/vpRetentionStore";
import { WinFeedBase } from "@/components/shared/retention/WinFeedBase";

export function WinFeed() {
  const sessionWins = useVPRetention((s) => s.sessionWins);
  const todayWins = useVPRetention((s) => s.todayWins);
  return <WinFeedBase sessionWins={sessionWins} todayWins={todayWins} />;
}
