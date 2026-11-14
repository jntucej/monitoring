export interface CspOptions { nonce: string; isDev: boolean; public?: boolean; }
export function buildCspHeader({ nonce, isDev, public: isPublic = false }: CspOptions): string {
  return [
    "default-src 'self'",
    // default-src 'self'
    //
    // script-src: two policies, split by route class.
    //
    // STRICT (all routes by default): per-request nonce + strict-dynamic.
    // The nonce is set on the response header by the edge middleware;
    // Next.js SSR reads it from the x-nonce request header and stamps it
    // on dynamically imported script tags. 'unsafe-inline' is omitted.
    // strict-dynamic means once a nonce-scoped script is trusted, every
    // dynamically-imported chunk it pulls in is implicitly trusted — the
    // strongest posture, and the right default for the authenticated
    // console surface where user content (complaints, announcements,
    // KB docs) is the stored-XSS vector.
    //
    // PUBLIC (force-static home page only):
    // The home page is the sole force-static route — Next.js caches the
    // HTML at build time and ships it without a nonce baked into the
    // script tags. Under strict-dynamic, 'self' is inert, so every
    // static chunk is blocked and the S:0 streaming wrapper never
    // un-hides → NO_FCP. For this route we drop strict-dynamic and add
    // 'unsafe-inline' so the page's own inline scripts (S:0 unhide, RSC
    // payload) run and 'self' covers external chunks.
    //
    // /login, /about, /help are DYNAMIC: they have no force-static
    // export, so Next.js SSR reads x-nonce and stamps it on script
    // tags — strict-dynamic works. They keep the strict posture and
    // must NOT be moved into PUBLIC_PATHS.
    //
    // The middleware picks the policy per route (PUBLIC_PATHS in
    // middleware.ts). Do NOT apply the public policy to authenticated
    // routes — that is the security regression this split exists to
    // avoid.
    isPublic
      ? `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`
      : `script-src 'self' ${nonce ? `'nonce-${nonce}' ` : ""}'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
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
