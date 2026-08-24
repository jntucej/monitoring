import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure webpack to handle native modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      // On server side, we can use native modules
      config.resolve.alias = {
        ...config.resolve.alias,
        better_sqlite3: false,
      };
    }
    // On client side, API routes will handle DB operations
    return config;
  },
  turbopack: {},
  // Security headers (Phase 6 hardening)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
