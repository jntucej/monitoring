"use client";

import { UpcomingPreviewBase, type UpcomingItem } from "@/components/shared/retention/UpcomingPreviewBase";

export type { UpcomingItem };

export function UpcomingPreview({ items }: { items: UpcomingItem[] }) {
  return <UpcomingPreviewBase items={items} ticketHrefPrefix="/supervisor/response/escalations?ticket=" />;
}
