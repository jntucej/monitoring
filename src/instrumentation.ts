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
  const { runSchemaDriftGuardOnBoot } = await import("@/lib/schema-drift-guard");
  runSchemaDriftGuardOnBoot();
}
