import { recordSseEvent } from "@/lib/sse-ring-buffer";

export function publishSecurityEvent(
  event: string,
  data: Record<string, unknown>,
) {
  return recordSseEvent(
    "gate-stream",
    { channel: "security:campus", ...data },
    event,
  );
}
