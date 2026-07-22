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

// ─────────────────────────────────────────────────────────────────────────
// Freno de fuerza bruta por INTENTOS FALLIDOS de contraseña.
//
// loginLimiter (arriba) corre dentro de /api/session, que solo se invoca
// DESPUÉS de que Firebase ya aceptó la contraseña — por eso nunca ve los
// intentos con clave incorrecta y no sirve como freno de fuerza bruta real.
//
// Aquí llevamos un contador manual en Redis, indexado por IP+correo, que se
// incrementa en cada fallo y se borra en cada login exitoso. No usamos
// @upstash/ratelimit porque su modelo de "consumir 1 token por request" no
// encaja: queremos poder MIRAR el contador (antes de dejar intentar) sin
// gastarlo, INCREMENTARLO solo cuando de verdad falla, y RESETEARLO al
// acertar. Un contador INCR + EXPIRE nos da exactamente ese control.
const MAX_FALLOS = 5;
const VENTANA_SEG = 5 * 60; // 5 minutos

function claveFallos(ip: string, email: string): string {
  return `jym-admin:login-fallos:${ip}:${email.toLowerCase().trim()}`;
}

// ¿Esta IP+correo ya superó el máximo de fallos? No modifica el contador.
export async function estaBloqueado(
  ip: string,
  email: string
): Promise<{ bloqueado: false } | { bloqueado: true; retryAfterSeconds: number }> {
  if (!redis) return { bloqueado: false };
  const clave = claveFallos(ip, email);
  const [fallosRaw, ttl] = await Promise.all([redis.get<number>(clave), redis.ttl(clave)]);
  const fallos = fallosRaw ?? 0;
  if (fallos >= MAX_FALLOS) {
    return { bloqueado: true, retryAfterSeconds: Math.max(1, ttl) };
  }
  return { bloqueado: false };
}

// Registra un intento fallido. La ventana (EXPIRE) se fija en el primer
// fallo y NO se renueva en los siguientes — así 5 fallos dentro de una misma
// ventana de 5 min bloquean, pero la ventana no se extiende indefinidamente
// con cada nuevo intento.
export async function registrarFallo(ip: string, email: string): Promise<void> {
  if (!redis) return;
  const clave = claveFallos(ip, email);
  const n = await redis.incr(clave);
  if (n === 1) await redis.expire(clave, VENTANA_SEG);
}

// Login exitoso → borra el contador para no arrastrar fallos previos.
export async function limpiarFallos(ip: string, email: string): Promise<void> {
  if (!redis) return;
  await redis.del(claveFallos(ip, email));
}

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
