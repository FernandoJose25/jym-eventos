import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: '200mb' } },
  images: {
    remotePatterns: [
      { protocol:'https', hostname:'res.cloudinary.com' },
      { protocol:'https', hostname:'firebasestorage.googleapis.com' },
    ],
  },
};

export default nextConfig;
