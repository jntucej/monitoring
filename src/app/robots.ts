import type { MetadataRoute } from "next";

const BASE = "https://monitor.cej.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/about", "/login", "/login/"],
        disallow: [
          "/admin/",
          "/sysadmin/",
          "/student/",
          "/approver/",
          "/operator/",
          "/gate/",
          "/worker/",
          "/supervisor/",
          "/mess/",
          "/parent/",
          "/person/",
          "/exam/",
          "/exam-branch/",
          "/campus/",
          "/visitor/",
          "/profile",
          "/settings/",
          "/security/",
          "/support",
          "/help",
          "/bootstrap",
          "/forbidden",
          "/api/",
          "/_next/",
          "/features",
          "/trust",
          "/privacy",
          "/terms",
          "/contact",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
