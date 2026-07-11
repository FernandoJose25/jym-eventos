/**
 * Cloudinary URL quality optimizer.
 *
 * Strategy:
 *  - Images: q_100 (lossless-equivalent max), f_auto (WebP/AVIF), fl_progressive:semi,
 *            dpr_auto (retina), fl_immutable_cache (long CDN TTL)
 *  - Videos: q_auto:best, vc_auto (best codec h265/vp9/h264), fl_progressive
 *
 * Safe: handles /upload/<transforms>/  AND  /upload/v1234/ patterns.
 * Idempotent: strips existing quality chain before re-inserting so calling
 * twice never stacks transforms.
 */

const CLOUD_RE = /\/upload\/(?:([^/]+)\/)?/;

function isCloudinary(url: string): boolean {
  return !!url && url.includes('res.cloudinary.com');
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|ogv|avi)(\?|$)/i.test(url) || url.includes('/video/upload/');
}

/** Strip any previously inserted transform chain so we can replace it cleanly */
function stripTransforms(url: string): string {
  // Remove existing transform chain between /upload/ and the version or filename
  return url.replace(/\/upload\/(?:[a-z][^/]*,?)+\/(?=v?\d|[a-z_])/i, '/upload/');
}

function buildImageUrl(url: string, transforms: string): string {
  if (!isCloudinary(url)) return url;
  const clean = stripTransforms(url);
  return clean.replace('/upload/', `/upload/${transforms}/`);
}

function buildVideoUrl(url: string, transforms: string): string {
  if (!isCloudinary(url)) return url;
  const clean = stripTransforms(url);
  return clean.replace('/upload/', `/upload/${transforms}/`);
}

/* ─── Image presets ──────────────────────────────────── */

/** Gallery masonry card — retina, calidad óptima automática, progressive JPEG fallback */
export function cxCard(url: string): string {
  if (!url) return '';
  const t = 'q_auto:best,f_auto,fl_progressive:semi,dpr_auto,w_1400,c_limit';
  return buildImageUrl(url, t);
}

/** Lightbox / full-screen — native resolution, calidad óptima automática */
export function cxFull(url: string): string {
  if (!url) return '';
  const t = 'q_auto:best,f_auto,fl_progressive:steep,dpr_auto';
  return buildImageUrl(url, t);
}

/** Service page hero — wide, calidad óptima automática */
export function cxHero(url: string): string {
  if (!url) return '';
  const t = 'q_auto:best,f_auto,fl_progressive:semi,dpr_auto,w_2400,c_limit';
  return buildImageUrl(url, t);
}

/** Admin thumbnail preview — smaller, fast load */
export function cxThumb(url: string): string {
  if (!url) return '';
  const t = 'q_auto:best,f_auto,dpr_auto,w_600,c_limit';
  return buildImageUrl(url, t);
}

/**
 * Open Graph / social share — JPEG forzado (Facebook/WhatsApp no recomprimen tanto),
 * calidad 100, sin dpr_auto, dimensiones OG estándar 1200×630.
 * f_jpg evita WebP que algunas redes no soportan o recomprimen más.
 */
export function cxOg(url: string): string {
  if (!url) return '';
  const t = 'q_100,f_jpg,w_1200,h_630,c_fill,g_auto';
  return buildImageUrl(url, t);
}

/* ─── Video preset ───────────────────────────────────── */

/**
 * Video delivery — best codec (H.265 → VP9 → H.264 fallback),
 * max quality, streaming-friendly.
 */
export function cxVideo(url: string): string {
  if (!url) return url;
  if (!isCloudinary(url)) return url;
  const t = 'q_auto:best,vc_auto,fl_progressive';
  return buildVideoUrl(url, t);
}

/**
 * Video para compartir en redes sociales (Instagram Stories / TikTok).
 * Fuerza H.264 + MP4: Instagram y TikTok rechazan H.265/VP9.
 * q_100 = sin pérdida de calidad absoluta.
 */
export function cxShareVideo(url: string): string {
  if (!url) return url;
  if (!isCloudinary(url)) return url;
  // q_auto:good = calidad alta pero archivo más pequeño → fetch más rápido para compartir
  const t = 'vc_h264,q_auto:good,f_mp4';
  return buildVideoUrl(url, t);
}

/**
 * Frame fijo de un video como portada estática (para tarjetas que hoy solo
 * saben mostrar <img>, como "También te puede interesar"). Cloudinary genera
 * el thumbnail cambiando el resource type de video a imagen y la extensión
 * a .jpg — funciona con cualquier URL de video ya subida, sin reprocesar nada.
 */
export function cxVideoThumb(url: string): string {
  if (!url) return '';
  if (!isCloudinary(url)) return url;
  const t = 'q_auto:best,f_jpg,w_1400,c_limit';
  const clean = stripTransforms(url)
    .replace('/video/upload/', '/upload/')
    .replace(/\.(mp4|webm|mov|ogv|avi)(\?|$)/i, '.jpg$2');
  return clean.replace('/upload/', `/upload/${t}/`);
}

/**
 * Calidad de video seleccionable manualmente por el usuario (engranaje del
 * reproductor, ver components/ui/CustomVideoPlayer.tsx). El componente ya
 * resuelve 'auto' llamando a cxVideo() directamente; esta función solo se
 * usa para las calidades numéricas explícitas, limitando la altura del
 * video y bajando el perfil de calidad para conexiones lentas/datos móviles.
 */
export type VideoQuality = 'auto' | 1080 | 720 | 480 | 360;

export function cxVideoQuality(url: string, quality: 1080 | 720 | 480 | 360): string {
  if (!url) return url;
  if (!isCloudinary(url)) return url;
  const t = `q_auto:good,vc_auto,fl_progressive,h_${quality},c_limit`;
  return buildVideoUrl(url, t);
}

/** Smart dispatcher — auto-detects image vs video */
export function cxAuto(url: string, size: 'thumb' | 'card' | 'full' | 'hero' = 'card'): string {
  if (!url) return '';
  if (isVideoUrl(url)) return cxVideo(url);
  switch (size) {
    case 'thumb': return cxThumb(url);
    case 'full': return cxFull(url);
    case 'hero': return cxHero(url);
    default: return cxCard(url);
  }
}
