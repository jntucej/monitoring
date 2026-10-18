// src/lib/seo/site-config.ts
//
// Single source of truth for public / marketing site metadata.
// Every SEO page, sitemap, robots.txt, and JSON-LD helper reads from here.
//
// Values match the deployment at monitor.cej.in (JNTU College of Engineering Jagtial).

export const SITE = {
  url: "https://monitor.cej.in",
  name: "Gate Monitor",
  college: {
    name: "JNTU College of Engineering Jagtial",
    shortName: "JNTUCEJ",
    address: "Jaggaiahpet, Jagtial, Telangana 505461",
    email: "admin@cej.in",
    website: "https://cej.ac.in",
  },
} as const;

/**
 * Pages that render without authentication.
 *
 * The app has no Next.js middleware in this deployment; a route is public
 * simply because its page (and its layout) does not import AuthGuard.
 * This list is kept as a machine-readable allowlist for:
 *   - robots.txt (what to disallow)
 *   - the header/footer marketing chrome (what to link to)
 *   - future middleware if one is added
 */
export const PUBLIC_ROUTE_PREFIXES = [
  "/",
  "/features",
  "/trust",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/login",
  "/bootstrap",
  "/help",
  "/support",
  "/security",
  "/forbidden",
  "/campus",
] as const;

export const LEGAL_DISCLAIMER =
  "Gate Monitor is operated by JNTU College of Engineering Jagtial and is held to the DPDP Act 2023 data-protection standard.";
