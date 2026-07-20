import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: '200mb' } },
  // sharp tiene binarios nativos (libvips) — hay que dejarlo fuera del
  // bundle de Turbopack/webpack para que Vercel lo resuelva directamente
  // desde node_modules en runtime con el binario correcto de linux-x64.
  // Sin esto, el build empaqueta una referencia rota al binario y la función
  // serverless falla con ERR_DLOPEN_FAILED (libvips-cpp.so no encontrado).
  serverExternalPackages: ['sharp'],
  images: {
    remotePatterns: [
      { protocol:'https', hostname:'res.cloudinary.com' },
      { protocol:'https', hostname:'firebasestorage.googleapis.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
