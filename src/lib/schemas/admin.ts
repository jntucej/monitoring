// src/lib/schemas/admin.ts
// U5: Zod schemas for admin mutation routes.

import { z } from "zod";
import { LIMITS } from "@/lib/validation";

// Announcements POST: the route currently enforces assertLength(title,
// ANNOUNCEMENT_TITLE) and assertLength(message, ANNOUNCEMENT_MESSAGE). Mirror
// those exact limits so behavior is unchanged — validation just moves to the
// shared layer instead of an inline throw.
// `message` and `body` are interchangeable in the route (message ?? body).
export const AnnouncementSchema = z.object({
  title: z.string({ error: "Title is required." }).min(1, "Title is required.").max(LIMITS.ANNOUNCEMENT_TITLE),
  message: z
    .string()
    .min(1, "Message is required.")
    .max(LIMITS.ANNOUNCEMENT_MESSAGE)
    .optional(),
  body: z.string().max(LIMITS.ANNOUNCEMENT_MESSAGE).optional(),
  audience: z.string().max(64).optional(),
  priority: z.string().max(32).optional(),
  publishNow: z.boolean().optional(),
  publishAt: z.string().max(64).optional(),
}).refine((b) => (b.message ?? b.body ?? "").length > 0, {
  message: "Message is required.",
  path: ["message"],
});

export type AnnouncementInput = z.infer<typeof AnnouncementSchema>;
