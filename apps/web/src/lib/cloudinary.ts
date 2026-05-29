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

/** Gallery masonry card — retina, max quality, progressive JPEG fallback */
export function cxCard(url: string): string {
  if (!url) return '';
  const t = 'q_100,f_auto,fl_progressive:semi,dpr_auto,w_1400,c_limit';
  return buildImageUrl(url, t);
}

/** Lightbox / full-screen — native resolution, truly lossless */
export function cxFull(url: string): string {
  if (!url) return '';
  const t = 'q_100,f_auto,fl_progressive:steep,dpr_auto';
  return buildImageUrl(url, t);
}

/** Service page hero — wide, high quality */
export function cxHero(url: string): string {
  if (!url) return '';
  const t = 'q_100,f_auto,fl_progressive:semi,dpr_auto,w_2400,c_limit';
  return buildImageUrl(url, t);
}

/** Admin thumbnail preview — smaller, fast load */
export function cxThumb(url: string): string {
  if (!url) return '';
  const t = 'q_auto:best,f_auto,dpr_auto,w_600,c_limit';
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
  // Cloudinary video transforms use vc_ (video codec) and q_ for quality
  const t = 'q_auto:best,vc_auto,fl_progressive';
  return buildVideoUrl(url, t);
}

/** Smart dispatcher — auto-detects image vs video */
export function cxAuto(url: string, size: 'thumb' | 'card' | 'full' | 'hero' = 'card'): string {
  if (!url) return '';
  if (isVideoUrl(url)) return cxVideo(url);
  switch (size) {
    case 'thumb': return cxThumb(url);
    case 'full':  return cxFull(url);
    case 'hero':  return cxHero(url);
    default:      return cxCard(url);
  }
}
