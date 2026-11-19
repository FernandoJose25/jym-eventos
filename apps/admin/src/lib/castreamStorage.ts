import { AwsClient } from 'aws4fetch';

/**
 * Depósito temporal de CASTREAM en Backblaze B2 (API compatible con S3). El bucket es
 * privado: el teléfono sube con un enlace firmado de PUT (los videos grandes no pasan
 * por Vercel) y cada red descarga con un enlace firmado de GET. Los archivos se borran
 * cuando todas las redes terminan; una regla de ciclo de vida del bucket los borra a
 * los 7 días por si algo falla.
 */

function b2() {
  const endpoint = process.env.CASTREAM_B2_ENDPOINT; // s3.us-east-005.backblazeb2.com
  const bucket = process.env.CASTREAM_B2_BUCKET;
  const accessKeyId = process.env.CASTREAM_B2_KEY_ID;
  const secretAccessKey = process.env.CASTREAM_B2_APP_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('Falta configurar el depósito de Backblaze B2 de CASTREAM en el servidor');
  }
  const region = endpoint.split('.')[1]; // la región va en el endpoint
  return { endpoint, bucket, aws: new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region }) };
}

const urlObjeto = (endpoint: string, bucket: string, key: string) =>
  `https://${endpoint}/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;

async function firmar(method: 'GET' | 'PUT', key: string, segundos: number): Promise<string> {
  const { endpoint, bucket, aws } = b2();
  const url = new URL(urlObjeto(endpoint, bucket, key));
  url.searchParams.set('X-Amz-Expires', String(segundos));
  const req = await aws.sign(url.toString(), { method, aws: { signQuery: true } });
  return req.url;
}

/** Enlace para que el teléfono suba el original directo al depósito (1 h). */
export const urlSubida = (key: string) => firmar('PUT', key, 3600);

/** Enlace de descarga para las redes: dura lo suficiente para que procesen videos largos (24 h). */
export const urlLectura = (key: string) => firmar('GET', key, 86400);

/** Comprueba que el teléfono terminó de subir el archivo. */
export async function existe(key: string): Promise<boolean> {
  const { endpoint, bucket, aws } = b2();
  const res = await aws.fetch(urlObjeto(endpoint, bucket, key), { method: 'HEAD' });
  return res.ok;
}

/** Subida desde el servidor (variantes que se generan aquí, p. ej. la copia para Instagram). */
export async function subir(key: string, datos: Buffer, contentType: string): Promise<void> {
  const { endpoint, bucket, aws } = b2();
  const res = await aws.fetch(urlObjeto(endpoint, bucket, key), {
    method: 'PUT', body: new Uint8Array(datos), headers: { 'Content-Type': contentType },
  });
  if (!res.ok) throw new Error(`El depósito rechazó el archivo (${res.status})`);
}

export async function descargar(key: string): Promise<Buffer> {
  const res = await fetch(await urlLectura(key));
  if (!res.ok) throw new Error(`No se pudo leer el archivo del depósito (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export async function borrar(keys: string[]): Promise<void> {
  const { endpoint, bucket, aws } = b2();
  await Promise.all(keys.map(k => aws.fetch(urlObjeto(endpoint, bucket, k), { method: 'DELETE' }).catch(() => {})));
}
