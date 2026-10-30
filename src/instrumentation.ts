import { resolveStorage } from "@/lib/attachment-storage";

/**
 * Next.js instrumentation entry point (registered once on process boot).
 *
 * Runs startup health checks before the app serves traffic:
 *   1. Verify the attachment upload volume is mounted and writable.
 *      Refuses to start if the volume is missing — better to fail the deploy
 *      than silently lose evidence.
 */
export async function register() {
  try {
    const storageRoot = await resolveStorage();
    console.log(`[instrumentation] attachment storage ready at ${storageRoot}`);
  } catch (err) {
    console.error("[instrumentation] FATAL: attachment storage unavailable:", err);
    process.exit(1);
  }
}
