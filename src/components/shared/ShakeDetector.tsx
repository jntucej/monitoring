'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/toast';

/**
 * ShakeDetector — detects phone shake gestures and auto-raises a technical bug
 * complaint. Designed to be mounted once at the app level (ClientProviders).
 *
 * How it works:
 *   1. Listens for the `deviceorientation` event (iOS/Android).
 *   2. On each event, computes the magnitude of change vs. the previous reading.
 *      Three consecutive high-magnitude deltas within a short window = "shake".
 *   3. On shake: debounces (won't re-trigger for 60 s), then POSTs to
 *      /api/complaints with categoryCode 'T1' (Technical bug / app issue).
 *   4. Shows a toast confirming the report was filed, or a hint if already
 *      reported recently.
 *
 * SSR / desktop guard: `typeof window === 'undefined'` or no
 * `window.DeviceOrientationEvent` → the hook is inert, no-op.
 */
const SHAKE_THRESHOLD = 12; // degrees-per-event delta
const SHAKE_CONSECUTIVE = 3; // events in a row before it counts as a shake
const SHAKE_DEBOUNCE_MS = 60_000; // 60 s cooldown
const STORAGE_KEY = 'shake_report_last_at';

function readLastShake(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function writeLastShake(ts: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(ts));
  } catch {
    /* ignore */
  }
}

async function reportBug(user: { id: string; role: string; name?: string; unique_id?: string } | null) {
  // Use the same auth headers as every other API call in the app.
  const { getAuthHeaders } = await import('@/lib/utils');
  const headers: Record<string, string> = getAuthHeaders();

  const payload = {
    categoryCode: 'T1',
    title: 'Shake-detected bug report',
    description: [
      'Auto-filed by shake gesture on mobile.',
      `Page: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}`,
      `User agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`,
      user ? `Reported by: ${user.name || user.unique_id} (${user.role}, ${user.id})` : 'Reported by: anonymous',
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n'),
  };

  const res = await fetch('/api/complaints', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  if (res.ok) return true;
  console.warn('[ShakeDetector] bug report failed:', res.status, await res.text().catch(() => ''));
  return false;
}

export function ShakeDetector() {
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const lastOrientation = useRef<{ x: number; y: number; z: number } | null>(null);
  const consecutiveCount = useRef(0);
  const lastShakeTime = useRef(readLastShake());

  useEffect(() => {
    // Inert on SSR, desktop, or browsers without the sensor API
    if (typeof window === 'undefined') return;
    if (typeof window.DeviceOrientationEvent === 'undefined') return;

    const onOrientation = (event: DeviceOrientationEvent) => {
      const x = event.beta ?? 0;
      const y = event.gamma ?? 0;
      const z = event.alpha ?? 0;

      if (lastOrientation.current) {
        const dx = Math.abs(x - lastOrientation.current.x);
        const dy = Math.abs(y - lastOrientation.current.y);
        const dz = Math.abs(z - lastOrientation.current.z);
        const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (delta > SHAKE_THRESHOLD) {
          consecutiveCount.current += 1;
        } else {
          consecutiveCount.current = 0;
        }
      }

      lastOrientation.current = { x, y, z };

      if (consecutiveCount.current >= SHAKE_CONSECUTIVE) {
        consecutiveCount.current = 0;

        const now = Date.now();
        if (now - lastShakeTime.current < SHAKE_DEBOUNCE_MS) {
          addToast({
            message: 'You just reported a bug — give it a minute before shaking again.',
            variant: 'info',
          });
          return;
        }

        lastShakeTime.current = now;
        writeLastShake(now);

        void reportBug(user).then((filed) => {
          if (filed) {
            addToast({
              title: 'Bug reported',
              message: 'The sysadmin team will follow up shortly.',
              variant: 'success',
            });
          } else {
            addToast({
              message: 'Could not file the bug report. Try again or use the complaint form.',
              variant: 'warning',
            });
          }
        });
      }
    };

    window.addEventListener('deviceorientation', onOrientation, { passive: true } as any);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, [user, addToast]);

  // No DOM output — this is a pure event listener.
  return null;
}
