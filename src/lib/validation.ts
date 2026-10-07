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
