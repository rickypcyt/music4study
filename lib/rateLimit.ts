// SOLO SERVIDOR. Límite de peticiones por IP en memoria (ventana fija).
// Frena bucles y abusos simples. Ojo: en serverless cada instancia tiene su propia memoria, así que es un
// freno básico, no una garantía; para algo estricto hay que usar un almacén compartido (p. ej. Upstash Redis).

const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/** Devuelve true si la petición está permitida. */
export function allow(request: Request, scope: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const key = `${scope}:${clientIp(request)}`;
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
