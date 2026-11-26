"use client";

import { useCallback } from "react";
import { useHodRetention } from "@/stores/hodRetentionStore";
import { CelebrateOverlayBase } from "@/components/shared/retention/CelebrateOverlayBase";

export function CelebrateOverlay({ queueEmpty }: { queueEmpty: boolean }) {
  const celebrating = useHodRetention((s) => s.celebrating);
  const sessionDecisions = useHodRetention((s) => s.sessionDecisions);
  const markCelebrated = useHodRetention((s) => s.markCelebrated);
  const onTrigger = useCallback(() => useHodRetention.setState({ celebrating: true }), []);

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
