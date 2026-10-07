// Shared utilities for the migration project
// Contains common helpers used across the application

import { PoolClient } from 'pg';
import { getEnv, query } from './env';
import { getPool } from './db';

/**
 * Format ISO date string for display
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Sanitize input string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input.replace(/["<>|\\]/g, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Log a message with timestamp
 */
export function logMessage(message: string, level = 'info'): void {
  const timestamp = new Date().toISOString();
  console.log(`[${level}] ${timestamp} - ${message}`);
}

/**
 * Fetch user from PostgreSQL database
 */
export async function fetchUser(userId: string): Promise<any> {
  try {
    const result = await query('SELECT id, name, email, role, status FROM users WHERE id = $1', [userId]);
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

/**
 * Check if user is active
 */
export async function isUserActive(userId: string): Promise<boolean> {
  try {
    const result = await query('SELECT status FROM users WHERE id = $1', [userId]);
    return !!result.rows[0]?.status === 'ACTIVE';
  } catch {
    return false;
  }
}