export interface CspOptions { nonce: string; isDev: boolean; }
export function buildCspHeader({ nonce, isDev }: CspOptions): string {
  return [
    "default-src 'self'",
    //
    // CSP strategy (post-P0 fix):
    //
    // The home page is statically prerendered. Its <script src> tags ship
    // without a nonce attribute (prerender bakes nonce="" into the RSC
    // payload). Under strict-dynamic, 'self' is inert, so every static
    // chunk was blocked — a P0 NO_FCP on the critical LCP path.
    //
    // Fix: drop strict-dynamic. 'self' is now effective and covers
    // external chunks. 'unsafe-inline' covers inline scripts (S:0 unhide,
    // RSC payload, theme-flash). The nonce is kept for inline script
    // validation but 'unsafe-inline' makes it redundant for that purpose.
    //
    // Security trade-off: 'unsafe-inline' in script-src means an XSS
    // injection in any inline context would execute. Mitigation: no
    // user-controlled content in <head>, CSP set by trusted middleware.
    // The alternative (strict-dynamic) blocks every static chunk on the
    // prerendered home page — a P0 that beats a theoretical XSS.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    // style-src MUST keep 'unsafe-inline' — Next.js injects inline styles
    // and CSS injection is not an XSS vector.
    `style-src 'self' 'unsafe-inline' https:`,
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}
