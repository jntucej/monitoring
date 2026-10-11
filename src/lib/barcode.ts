// src/lib/barcode.ts
/**
 * Normalizes any scanned payload (QR JSON, QR URL, 1D barcode text,
 * key=value pair) into the canonical identifier used by
 * findPersonByUniqueId (users.unique_id / student_details.roll /
 * employee_details.employee_id).
 */

export const SCANNABLE_FORMATS = [
  "qr_code",
  "code_128", "code_39", "code_93", "codabar",
  "ean_13", "ean_8", "itf", "upc_a", "upc_e",
  "pdf417", "data_matrix", "aztec",
] as const;

export type ScannableFormat = (typeof SCANNABLE_FORMATS)[number];

const JNTUH_ROLL = /^[0-9]{2}[A-Z]{2}[0-9A-Z]{2}[0-9]{2}[0-9A-Z]{2}$/;
const EMPLOYEE_ID = /^[A-Z]{2,5}[-_]?[0-9]{2,6}$/;
const NUMERIC = /^[0-9]{3,12}$/;

export function normalizeScannedPayload(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";

  // 1. JSON payload: {"roll":"24JJ1A0501"} or {"student_roll":"24JJ1A0501"} or {"uniqueId":"..."}
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const p = JSON.parse(trimmed);
      const candidate = p.roll || p.student_roll || p.unique_id || p.uniqueId || p.employee_id || p.personId;
      if (candidate) return String(candidate).trim().toUpperCase();
    } catch { /* not JSON, fall through */ }
  }

  // 2. URL form: https://campus.edu/id/24JJ1A0201
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const last = url.pathname.split("/").filter(Boolean).pop();
      if (last) return last.trim().toUpperCase();
    } catch { /* fall through */ }
  }

  // 3. key=value / key:value (id=, roll=, emp=, employee=)
  const kv = trimmed.match(/^(?:id|roll|emp|employee)[=:]\s*(.+)$/i);
  if (kv) return kv[1].trim().toUpperCase();

  // 4. Plain barcode text — uppercase for the lookup tiers
  return trimmed.toUpperCase();
}

/** True for formats that are 1D/2D barcodes (not QR). */
export function isRecognizedIdentifier(value: string): boolean {
  const v = normalizeScannedPayload(value);
  return JNTUH_ROLL.test(v) || EMPLOYEE_ID.test(v) || NUMERIC.test(v) || (v.length >= 4);
}