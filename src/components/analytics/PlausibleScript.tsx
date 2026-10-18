// src/components/analytics/PlausibleScript.tsx
//
// Consent-free analytics. Cookie-less by design (Plausible) so no consent
// banner is required — this matches the DPDP positioning in /privacy.
//
// Inert unless NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set in the deployment env.
// To enable: set NEXT_PUBLIC_PLAUSIBLE_DOMAIN=monitor.cej.in on the web service
// and redeploy. No code change needed.

"use client";

import { useEffect } from "react";

const PLAUSIBLE_DOMAIN =
  process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "";

export function PlausibleScript() {
  useEffect(() => {
    // Off by default — no script, no cookie, no network call.
    if (!PLAUSIBLE_DOMAIN) return;

    const script = document.createElement("script");
    script.src = `https://plausible.io/js/script.js`;
    script.setAttribute("data-domain", PLAUSIBLE_DOMAIN);
    script.setAttribute("data-website-token", process.env.NEXT_PUBLIC_PLAUSIBLE_WEBSITE_TOKEN ?? "");
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  // Render nothing in the DOM — the script is injected imperatively.
  return null;
}
