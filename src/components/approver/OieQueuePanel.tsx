"use client";
// src/components/approver/OieQueuePanel.tsx
// SCAFFOLD:QUEUE — feature wrapper for the OIE exam-desk queue.
// Regenerate with: node scripts/scaffold-stage-queue.mjs new oie --force

import { useCallback } from "react";
import {
  StageQueuePanel,
  actOnTicket,
  type StageQueueRow,
  type QueueAction,
} from "./StageQueuePanel";

const MY_STAGE = "oie";
const CHAIN = ["faculty", "hod", "oie", "vice_principal", "principal", "completed"];

export interface OieQueuePanelProps {
  title?: string;
}

export function OieQueuePanel({
  title = "OIE Queue",
}: OieQueuePanelProps) {
  const onAction = useCallback(
    async (row: StageQueueRow, action: QueueAction, comment: string) => {
      // Single write surface: PATCH /api/permissions/[ticket]. The server owns
      // the stage check; this wrapper only surfaces the reason on refusal.
      await actOnTicket(row.ticket_number, action, comment);
    },
    [],
  );

  return (
    <StageQueuePanel
      url="/api/oie/queue"
      myStage={MY_STAGE}
      chain={CHAIN}
      onAction={onAction}
      title={title}
      allowForward
    />
  );
}

export default OieQueuePanel;
