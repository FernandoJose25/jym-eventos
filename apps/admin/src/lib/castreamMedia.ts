import { createHash } from 'crypto';

/**
 * Almacenamiento de la galería de CASTREAM: una cuenta de Cloudinary propia (no la de
 * J&M), con una carpeta por negocio. Es el único punto que conoce al proveedor: para
 * cambiarlo (p. ej. a Cloudflare R2) basta con reescribir este archivo.
 */

export interface MediaSubida {
  url: string;
  storageId: string;
  width: number | null;
  height: number | null;
}

function cuenta() {
  const cloud = process.env.CASTREAM_CLOUDINARY_CLOUD_NAME;
  const key = process.env.CASTREAM_CLOUDINARY_API_KEY;
  const secret = process.env.CASTREAM_CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) throw new Error('Falta configurar la cuenta de Cloudinary de CASTREAM en el servidor');
  return { cloud, key, secret };
}

const firmar = (params: Record<string, string>, secret: string) =>
  createHash('sha1')
    .update(Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + secret)
    .digest('hex');

/** Sube el archivo en su calidad original (sin transformar). */
export async function subirMedia(opts: {
  datos: Buffer; filename: string; tipo: 'image' | 'video'; businessId: string;
}): Promise<MediaSubida> {
  const { cloud, key, secret } = cuenta();
  const params = { folder: `castream/${opts.businessId}`, timestamp: String(Math.round(Date.now() / 1000)) };

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(opts.datos)]), opts.filename);
  form.append('api_key', key);
  form.append('signature', firmar(params, secret));
  for (const [k, v] of Object.entries(params)) form.append(k, v);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${opts.tipo}/upload`, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Cloudinary rechazó el archivo (${res.status})`);
  return { url: data.secure_url, storageId: data.public_id, width: data.width ?? null, height: data.height ?? null };
}
