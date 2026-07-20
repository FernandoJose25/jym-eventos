import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Si las credenciales de Upstash no están configuradas (ej. en desarrollo
// local antes de que el usuario cree su cuenta), no bloqueamos el sitio
// entero — dejamos pasar sin límite y avisamos por consola. En producción
// las variables SIEMPRE deben estar seteadas en Vercel.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

if (!redis && process.env.NODE_ENV === 'production') {
  console.warn('[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN no configuradas — rate limiting deshabilitado en producción.');
}

function makeLimiter(prefix: string, limit: number, window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `jym:${prefix}`,
  });
}

export const contactoLimiter = makeLimiter('contacto', 3, '10 m');
export const camaraSignLimiter = makeLimiter('camara-sign', 20, '1 m');
export const camaraPublicadoLimiter = makeLimiter('camara-publicado', 30, '1 m');

export function ipDe(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || 'sin-ip';
}

// Devuelve null si pasa el límite, o la respuesta 429 lista para retornar.
// Si Upstash no está configurado, siempre pasa (fail-open).
export async function checkLimit(
  limiter: Ratelimit | null,
  key: string
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  if (!limiter) return { ok: true };
  const { success, reset } = await limiter.limit(key);
  if (success) return { ok: true };
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
}
