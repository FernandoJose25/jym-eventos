import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      // Fallback estático de SERVICIOS_DATA en ServicioClient.tsx usa fotos de
      // Unsplash cuando Firestore no trae media propia — mismo bloque JSX que
      // renderiza las URLs de Cloudinary, así que ambos hosts deben poder
      // pasar por next/image sin romper el build.
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  // Refuerzo de caché para assets propios servidos desde /public (íconos,
  // manifest, favicon). No tocamos /_next/static: Vercel ya lo sirve con
  // el Cache-Control óptimo por defecto — sobrescribirlo solo genera un
  // warning en build y puede romper el comportamiento en desarrollo.
  // Las imágenes/videos de Cloudinary tampoco necesitan nada aquí — ya
  // sirven con Cache-Control de muy larga duración por su propia CDN.
  async headers() {
    return [
      {
        source: '/:path*.(svg|png|jpg|jpeg|webp|ico|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};
export default nextConfig;
