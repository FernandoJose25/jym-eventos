/**
 * "Ambas a la vez" de CASTREAM con Upstream.so, un servicio en línea gratuito (24 h al mes,
 * un stream a la vez, sin marca de agua, sin tarjeta): el celular le manda una sola señal y
 * Upstream la reparte. Se usa un solo stream de Upstream para todo CASTREAM; en cada live su
 * salida principal pasa a ser el RTMPS de Facebook y su destino extra el RTMP de TikTok.
 * Docs: https://studio.upstream.so/docs/api (OpenAPI en /docs/api.openapi).
 */

const API = 'https://studio.upstream.so/api/v1';
const NOMBRE = 'CASTREAM · Ambas a la vez';
// Lo mismo que manda el celular: vertical 720p a 30 fps. Sin grabación (no gasta almacenamiento).
const SALIDA = {
  encoding: { resolution: '720x1280', frame_rate: 30, bitrate: 3000, audio_bitrate: 128 },
  video_fit: { object_fit: 'cover' },
  recording: { enabled: false },
};

interface Stream { id: string; name: string; status: string; paused_reason?: string | null; paused_message?: string | null }
interface Ingesta { url: string; stream_key: string }

export const upstreamDisponible = () => !!process.env.UPSTREAM_API_KEY;

async function up<T>(metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: object): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${process.env.UPSTREAM_API_KEY}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (res.status === 204) return undefined as T;
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.message || `Upstream respondió ${res.status}`);
  return d.data as T;
}

const pausa = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Lee el stream cada 3 s (el límite es 60 pedidos por minuto) hasta que llegue a uno de esos estados. */
async function esperar(id: string, estados: string[], maxMs: number): Promise<Stream> {
  const fin = Date.now() + maxMs;
  for (;;) {
    const s = await up<Stream>('GET', `/streams/${id}`);
    if (estados.includes(s.status) || Date.now() > fin) return s;
    await pausa(3000);
  }
}

async function buscarStream(): Promise<Stream | undefined> {
  const lista = await up<Stream[]>('GET', '/streams?per_page=100');
  return lista.find(s => s.name === NOMBRE);
}

/**
 * Deja el stream listo para un live y lo enciende. Devuelve la URL RTMP a la que transmite el
 * celular. Upstream recibe la señal desde el primer segundo, pero tarda ~50 s en empezar a
 * mandarla a Facebook y TikTok (probado 2026-11-19). `ocupado()` dice si un stream ya encendido pertenece a otro live en curso; si no,
 * es uno que quedó abierto y se apaga.
 */
export async function prepararAmbas(facebookRtmp: string, tiktokRtmp: string, ocupado: () => Promise<boolean>): Promise<string> {
  let s = await buscarStream()
    ?? await up<Stream>('POST', '/streams', { name: NOMBRE, platform: 'custom', type: 'live', key: facebookRtmp, ...SALIDA });

  if (s.status === 'booting' || s.status === 'active') {
    if (await ocupado()) throw new Error('OCUPADO');
    await up('POST', `/streams/${s.id}/stop`);
  }
  s = await esperar(s.id, ['paused'], 25_000);
  if (s.status !== 'paused') throw new Error(`el servidor aún no está listo (${s.status}); vuelve a intentar en un minuto`);

  await up('PATCH', `/streams/${s.id}`, { platform: 'custom', key: facebookRtmp, ...SALIDA });
  const destinos = await up<{ id: string }[]>('GET', `/streams/${s.id}/destinations`);
  await Promise.all(destinos.map(d => up('DELETE', `/streams/${s.id}/destinations/${d.id}`)));
  await up('POST', `/streams/${s.id}/destinations`, { name: 'TikTok', platform: 'custom', key: tiktokRtmp, status: 'active' });

  // La primera vez se crea la entrada RTMP; después se reutiliza la misma clave.
  const ingesta = await up<Ingesta>('POST', `/streams/${s.id}/source/rtmp/credentials`)
    .catch(() => up<Ingesta>('POST', `/streams/${s.id}/source/rtmp`));

  await up('POST', `/streams/${s.id}/start`);
  return `${ingesta.url.replace(/\/+$/, '')}/${ingesta.stream_key}`;
}

/** Apaga el stream (deja de contar horas del plan). */
export async function pararAmbas() {
  const s = await buscarStream();
  if (s && s.status !== 'paused') await up('POST', `/streams/${s.id}/stop`);
}
