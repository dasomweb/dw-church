import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['@dw-church/api-client', '@dw-church/ui-components'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.dw-church.app' },
      { protocol: 'https', hostname: '**.truelight.app' },
      { protocol: 'https', hostname: '**.wp.com' },
      { protocol: 'https', hostname: '**.googleapis.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'bethelfaith.com' },
    ],
  },
};

export default nextConfig;
