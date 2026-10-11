import bcrypt from "bcryptjs";

/**
 * Server-side cryptographic utilities.
 * Kept in server/ to satisfy layering rules (API routes must not import bcryptjs directly).
 */

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function compareSync(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function hashSync(password: string): string {
  return bcrypt.hashSync(password, 10);
}

// Async versions for routes that need them
export async function hash(code: string, rounds: number = 10): Promise<string> {
  return bcrypt.hash(code, rounds);
}

export async function compare(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export async function genSalt(rounds: number = 10): Promise<string> {
  return bcrypt.genSalt(rounds);
}
