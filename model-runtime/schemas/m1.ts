import { z } from "zod";

// model-runtime/schemas/m1.ts
// The conversation/tool-routing model MUST emit this shape. Raw model output is
// never trusted; it is parsed and validated here. On invalid output the call is
// retried once, then a typed error is returned.

export const ToolActionSchema = z.object({
  action: z.string().min(1),
  // z.record(keyType, valueType) — keys are strings, values are arbitrary.
  parameters: z.record(z.string(), z.unknown()).optional(),
  clarify: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type ToolAction = z.infer<typeof ToolActionSchema>;

// A known tool registry entry. The permission engine authorizes against these.
export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Pull the first balanced JSON object out of the model's free text. Models
 * sometimes wrap JSON in prose or ```json fences; this recovers it.
 */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("no JSON object in model output");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export function parseToolAction(raw: string): ToolAction {
  return ToolActionSchema.parse(extractJson(raw));
}
