"use client";

import { useCallback } from "react";
import { useSupervisorRetention } from "@/stores/supervisorRetentionStore";
import { CelebrateOverlayBase } from "@/components/shared/retention/CelebrateOverlayBase";

export function CelebrateOverlay({ queueEmpty }: { queueEmpty: boolean }) {
  const celebrating = useSupervisorRetention((s) => s.celebrating);
  const sessionDecisions = useSupervisorRetention((s) => s.sessionDecisions);
  const markCelebrated = useSupervisorRetention((s) => s.markCelebrated);
  const onTrigger = useCallback(() => useSupervisorRetention.setState({ celebrating: true }), []);

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
