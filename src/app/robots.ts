// src/app/robots.ts
//
// SEO robots.txt for the public marketing cluster.

import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The marketing cluster is the publicly indexable surface.
        // /api/* is the application interface — keep crawlers out.
        disallow: ["/api/", "/(admin)/", "/(approver)/", "/(operator)/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
