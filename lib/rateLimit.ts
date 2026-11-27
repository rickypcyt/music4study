// SOLO SERVIDOR. Límite de peticiones por IP.
// Con credenciales de Upstash los contadores se comparten entre instancias (ventana deslizante).
// Sin ellas, o si Redis falla, se usa la memoria de cada instancia (ventana fija): un freno básico, no una garantía.
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

// La integración de Vercel puede crear las variables con el prefijo KV_
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const limiters = new Map<string, Ratelimit>();

function limiter(client: Redis, scope: string, limit: number, windowMs: number): Ratelimit {
  const key = `${scope}:${limit}:${windowMs}`;
  let l = limiters.get(key);
  if (!l) {
    l = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: `music4study:ratelimit:${scope}`,
      timeout: 1000, // si Redis tarda más, la librería deja pasar la petición
    });
    limiters.set(key, l);
  }
  return l;
}

function allowInMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);

  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

/** Devuelve true si la petición está permitida. */
export async function allow(request: Request, scope: string, limit: number, windowMs = 60_000): Promise<boolean> {
  const ip = clientIp(request);
  if (redis) {
    try {
      return (await limiter(redis, scope, limit, windowMs).limit(ip)).success;
    } catch (error) {
      console.error('rateLimit: Upstash no disponible, se usa memoria:', error);
    }
  }
  return allowInMemory(`${scope}:${ip}`, limit, windowMs);
}
