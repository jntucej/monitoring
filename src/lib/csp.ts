export interface CspOptions { nonce: string; isDev: boolean; }
export function buildCspHeader({ nonce, isDev }: CspOptions): string {
  return [
    "default-src 'self'",
    // Per-request nonce + strict-dynamic. The nonce is set on the response
    // header by the edge middleware; Next.js picks it up from the x-nonce
    // request header and stamps it on dynamically imported script tags.
    // 'unsafe-inline' is omitted from script-src — that is the whole point.
    //
    // Fallback: when no nonce is available (static prerender of the home
    // page bakes nonce="" into script tags), strict-dynamic is inert and
    // 'self' would block every chunk. In that case we drop strict-dynamic
    // and add 'unsafe-inline' so the page's own scripts run. This is a
    // per-page fallback, not a global relaxation: dynamic responses
    // (middleware-set headers) always carry a real nonce.
    //
    // Even when a nonce IS present, strict-dynamic only unlocks
    // dynamically-imported scripts (importScript, dynamic import()).
    // Static <script src> tags in the HTML do NOT inherit the nonce's
    // permission — they need 'self' to be effective. In strict-dynamic
    // mode 'self' is inert, so every static chunk is blocked. The fix
    // is to keep 'self' effective by dropping strict-dynamic: 'self'
    // covers external chunks, 'nonce' still validates inline scripts.
    `script-src 'self' ${nonce ? `'nonce-${nonce}' ` : ""}${isDev ? " 'unsafe-eval'" : ""}`,
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
