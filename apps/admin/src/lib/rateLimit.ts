import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Igual que apps/web/src/lib/rateLimit.ts: si Upstash no está configurado,
// no bloqueamos el login entero — dejamos pasar sin límite (fail-open) y
// avisamos por consola. Firebase Auth ya aplica su propio backoff genérico
// como respaldo mínimo aunque esto no esté configurado.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

if (!redis && process.env.NODE_ENV === 'production') {
  console.warn('[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN no configuradas — límite de intentos de login deshabilitado.');
}

export const loginLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '5 m'),
      prefix: 'jym-admin:login',
    })
  : null;

export function ipDe(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || 'sin-ip';
}

export async function checkLimit(
  limiter: Ratelimit | null,
  key: string
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  if (!limiter) return { ok: true };
  const { success, reset } = await limiter.limit(key);
  if (success) return { ok: true };
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
}
