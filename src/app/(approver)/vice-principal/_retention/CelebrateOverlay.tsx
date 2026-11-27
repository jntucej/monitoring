"use client";

import { useCallback } from "react";
import { useVPRetention } from "@/stores/vpRetentionStore";
import { CelebrateOverlayBase } from "@/components/shared/retention/CelebrateOverlayBase";

export function CelebrateOverlay({ queueEmpty }: { queueEmpty: boolean }) {
  const celebrating = useVPRetention((s) => s.celebrating);
  const sessionDecisions = useVPRetention((s) => s.sessionDecisions);
  const markCelebrated = useVPRetention((s) => s.markCelebrated);
  const onTrigger = useCallback(() => useVPRetention.setState({ celebrating: true }), []);

  return (
    <CelebrateOverlayBase
      queueEmpty={queueEmpty}
      celebrating={celebrating}
      sessionDecisions={sessionDecisions}
      onTrigger={onTrigger}
      onMarkCelebrated={markCelebrated}
    />
  );
}
