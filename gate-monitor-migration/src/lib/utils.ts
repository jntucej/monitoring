// Shared utilities for the migration project
// Contains common helpers used across the application

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env';

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
  return input.replace(/[\"<>\]|\\|/]/g, '');
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
 * Fetch user info from database
 */
export async function fetchUser(userId: string): Promise<any> {
  const db = createClient(getEnv().supabaseUrl, getEnv().supabaseAnonKey);
  const user = await db.from('users').eq('id', userId).first();
  return user || null;
}

/**
 * Check if user is active
 */
export async function isUserActive(userId: string): Promise<boolean> {
  const db = createClient(getEnv().supabaseUrl, getEnv().supabaseAnonKey);
  const user = await db.from('users').eq('id', userId).first();
  return !!user?.is_active || !!user?.status;
}
