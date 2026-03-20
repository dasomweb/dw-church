import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@dw-church/api-client', '@dw-church/ui-components'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.dw-church.app' },
      { protocol: 'https', hostname: '**.wp.com' },
      { protocol: 'https', hostname: '**.googleapis.com' },
    ],
  },
};

export default nextConfig;
