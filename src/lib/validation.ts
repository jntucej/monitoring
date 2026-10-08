/**
 * Centralized Schema & Input Validation Helpers
 * Validates API request bodies and prevents malformed data injection.
 */

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  error?: string;
}

export function validateLoginPayload(body: any): ValidationResult<{ identifier: string; pass: string }> {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object' };
  }
  const identifier = (body.identifier || body.username || body.uniqueId || body.roll || '').toString().trim();
  const pass = (body.password || body.pin || '').toString().trim();

  if (!identifier) {
    return { valid: false, error: 'Identifier (username/roll/uniqueId) is required' };
  }
  if (!pass) {
    return { valid: false, error: 'Password or PIN is required' };
  }

  return { valid: true, data: { identifier, pass } };
}

export function validatePassRequestPayload(body: any): ValidationResult<Record<string, any>> {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object' };
  }
  if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length === 0) {
    return { valid: false, error: 'Pass reason is required and must be a non-empty string' };
  }
  return { valid: true, data: body };
}

export const LIMITS = {
  FEEDBACK_COMMENT: 5000,
  FEEDBACK_THEME: 200,
  TICKET_SUBJECT: 200,
  TICKET_DESCRIPTION: 5000,
  TICKET_COMMENT: 3000,
  ANNOUNCEMENT_TITLE: 200,
  ANNOUNCEMENT_MESSAGE: 5000,
  USER_NAME: 200,
} as const;

export function assertLength(value: unknown, max: number, field: string): string {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} cannot be empty`);
  if (trimmed.length > max) throw new Error(`${field} exceeds ${max} characters`);
  return trimmed;
}

