const isDockerBuild = process.env.DOCKER_BUILD === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isDockerBuild ? 'standalone' : undefined,
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: '2mb' }
  },
  serverExternalPackages: ['pg'],
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
};

export default nextConfig;

