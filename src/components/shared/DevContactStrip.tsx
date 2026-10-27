// Disabled per user request (2026-10-16): the "Developer" contact strip is removed from all pages; use the shared /support page instead. Revert this file to re-enable.
// Note: the canonical support page is /support (src/app/support/page.tsx), which posts to /api/dev/contact.

/**
 * Compact "Contact the developer" strip shown on every user dashboard.
 * POSTs to /api/dev/contact (delivers to the developer via Telegram) and
 * shows an inline confirmation. Rate-limited + per-user opt-out are
 * enforced server-side (users.dev_contact_enabled).
 *
 * @deprecated Renders null — the strip was removed from all pages (2026-10-16).
 */
export function DevContactStrip(_props: { defaultOpen?: boolean }) {
  return null;
}
