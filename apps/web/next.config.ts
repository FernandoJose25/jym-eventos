import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },

  // Refuerzo de caché — Vercel ya cachea agresivamente los assets de
  // /_next/static por defecto (son inmutables, tienen hash en el nombre),
  // pero lo dejamos explícito. Nota: las imágenes/videos de Cloudinary NO
  // necesitan nada aquí — res.cloudinary.com ya sirve con Cache-Control de
  // muy larga duración por su propia CDN, así que el navegador ya no vuelve
  // a descargarlas en una segunda visita a esa misma URL transformada.
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Íconos, manifest, favicon, etc. servidos desde /public
        source: '/:path*.(svg|png|jpg|jpeg|webp|ico|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};
export default nextConfig;
