/**
 * Cloudinary URL quality optimizer (admin copy — same logic as web).
 * q_100 = maximum quality, f_auto = WebP/AVIF, dpr_auto = retina, fl_progressive.
 */

function stripTransforms(url: string): string {
  return url.replace(/\/upload\/(?:[a-z][^/]*,?)+\/(?=v?\d|[a-z_])/i, '/upload/');
}

function build(url: string, t: string): string {
  if (!url?.includes('res.cloudinary.com')) return url || '';
  const clean = stripTransforms(url);
  return clean.replace('/upload/', `/upload/${t}/`);
}

export const cxThumb = (url: string) => build(url, 'q_auto:best,f_auto,dpr_auto,w_600,c_limit');
export const cxCard  = (url: string) => build(url, 'q_100,f_auto,fl_progressive:semi,dpr_auto,w_1400,c_limit');
export const cxFull  = (url: string) => build(url, 'q_100,f_auto,fl_progressive:steep,dpr_auto');
export const cxVideo = (url: string) => build(url, 'q_auto:best,vc_auto,fl_progressive');
