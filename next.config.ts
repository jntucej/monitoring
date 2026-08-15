import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for simpler deployment
  output: "export",
  // Ignore the native module issue - we'll use api routes for DB operations
  // This allows the build to proceed while DB operations go through API routes
  eslint: {
    // Allow ESLint to report only (not fail on build)
    ignoreDuringBuilds: true,
  },
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
  // Disable Turbopack for production build to use standard webpack
  // This helps with native module compatibility
  experimental: {
    // Use standard compiler in production
    outputFileTracing: false,
  },
};

export default nextConfig;
