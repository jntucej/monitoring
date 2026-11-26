// src/lib/schemas/bot.ts
// U5: Zod schema for the RAG bot chat route.

import { z } from "zod";

// Bot chat: `message` is the required, bounded field (the route already caps
// it at 4000). `conversationId` is an optional UUID-ish string. `lang` is
// en|te; `sourceLang` is en|te|auto. Unknown extra fields are tolerated so
// existing clients keep working.
export const BotChatSchema = z.object({
  message: z.string().min(1, "Message is required.").max(4000, "Message is too long."),
  conversationId: z.string().max(64).optional(),
  lang: z.enum(["en", "te"]).optional(),
  sourceLang: z.enum(["en", "te", "auto"]).optional(),
  groupId: z.string().max(64).optional(),
  activeConsoleRole: z.string().max(64).optional(),
  entityContext: z.record(z.string(), z.unknown()).optional(),
  tool: z.enum(["get_pending_items", "get_unnoted_circulars", "explain_workflow_status", "draft_action"]).optional(),
}).passthrough();

export type BotChatInput = z.infer<typeof BotChatSchema>;
