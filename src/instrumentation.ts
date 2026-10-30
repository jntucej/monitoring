/**
 * Next.js instrumentation hook (server runtime only).
 *
 * Fires once on web-server boot. Used today to run the schema-drift
 * guard so an operator sees a loud log line if the container is
 * running code that expects a newer migration than the database has
 * applied. See src/lib/schema-drift-guard.ts.
 *
 * Keep this module side-effect-light: it must not import anything
 * that pulls node-only packages into the client bundle, and it must
 * not block server startup on DB connectivity (the guard is fire-
 * and-forget and handles its own failures).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Fail closed in production if kiosk is left in open mode without PIN or trusted IP restriction
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.KIOSK_SESSION_REQUIRE_PIN &&
    !process.env.TRUSTED_KIOSK_IPS
  ) {
    console.error(
      "FATAL: KIOSK_SESSION_REQUIRE_PIN=true or TRUSTED_KIOSK_IPS must be set in production to prevent open kiosk mode."
    );
    process.exit(1);
  }

  const { runSchemaDriftGuardOnBoot } = await import("@/lib/schema-drift-guard");
  runSchemaDriftGuardOnBoot();
}
