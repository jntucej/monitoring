/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "date-fns",
      "@simplewebauthn/browser",
      "qrcode.react",
      "react-qrcode-logo",
      "remotion",
      "@remotion/player",
    ],
  },

  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  output: 'standalone',

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },

  async redirects() {
    return [
      { source: "/features", destination: "/login",   permanent: true },
      { source: "/trust",    destination: "/login",   permanent: true },
      { source: "/privacy",  destination: "/login",   permanent: true },
      { source: "/terms",    destination: "/login",   permanent: true },
      { source: "/contact",  destination: "/about",   permanent: true },
    ];
  },

  async headers() {
    const isProd = process.env.NODE_ENV === "production";

    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(self), geolocation=(self)",
      },
      ...(isProd
        ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
        : []),
    ];

    return [
      { source: "/:path*", headers: securityHeaders },

      {
        source: "/about",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/login",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/help",
        headers: [
          { key: "Cache-Control", value: "public, max-age=600, s-maxage=7200, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/support",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },

      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },

      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
