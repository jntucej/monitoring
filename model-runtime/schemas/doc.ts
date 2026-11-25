import { z } from "zod";

// model-runtime/schemas/doc.ts
// M3 (document intelligence) output. The model converts extracted text +
// metadata + this schema into structured JSON. The date fields use a permissive
// format so OCR-approximate dates still validate; consumers normalize.

const dateStr = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "expected YYYY / YYYY-MM / YYYY-MM-DD").nullable();
const money = z.object({
  value: z.number(),
  currency: z.string().optional(),
});

export const DocumentExtractionSchema = z.object({
  document_type: z.string().min(1),
  confidence: z.number().min(0).max(1),
  document_number: z.string().nullable(),
  issue_date: dateStr,
  valid_from: dateStr,
  valid_until: dateStr,
  issuer: z.string().nullable(),
  recipient: z.string().nullable(),
  amount: money.nullable(),
  // Free-form slots for document-specific fields the schema asked for.
  extra: z.record(z.string(), z.unknown()).optional(),
});

export type DocumentExtraction = z.infer<typeof DocumentExtractionSchema>;

export function parseDocumentExtraction(raw: string, extractJson: (t: string) => unknown): DocumentExtraction {
  return DocumentExtractionSchema.parse(extractJson(raw));
}
