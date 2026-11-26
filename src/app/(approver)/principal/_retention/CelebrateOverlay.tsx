"use client";

import { useCallback } from "react";
import { usePrincipalRetention } from "@/stores/principalRetentionStore";
import { CelebrateOverlayBase } from "@/components/shared/retention/CelebrateOverlayBase";

export function CelebrateOverlay({ queueEmpty }: { queueEmpty: boolean }) {
  const celebrating = usePrincipalRetention((s) => s.celebrating);
  const sessionDecisions = usePrincipalRetention((s) => s.sessionDecisions);
  const markCelebrated = usePrincipalRetention((s) => s.markCelebrated);
  const onTrigger = useCallback(() => usePrincipalRetention.setState({ celebrating: true }), []);

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
