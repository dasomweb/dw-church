import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone output for Railway/Docker deployment (small image size)
  output: 'standalone',
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
      // R2 public bucket
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
    ],
  },
};

export default nextConfig;
