import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const request = (ip: string) => new Request('http://localhost', { headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` } });

// Cada prueba importa el módulo de cero, sin credenciales: se prueba el modo en memoria y nunca se toca Redis real
async function load() {
  vi.resetModules();
  return import('@/lib/rateLimit');
}

beforeEach(() => {
  for (const name of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']) {
    vi.stubEnv(name, '');
  }
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('rateLimit en memoria', () => {
  it('toma la primera IP de x-forwarded-for', async () => {
    const { clientIp } = await load();
    expect(clientIp(request('1.2.3.4'))).toBe('1.2.3.4');
    expect(clientIp(new Request('http://localhost'))).toBe('unknown');
  });

  it('bloquea al pasar el límite y se reinicia al acabar la ventana', async () => {
    const { allow } = await load();
    const req = request('1.1.1.1');
    expect(await allow(req, 'test', 2, 1000)).toBe(true);
    expect(await allow(req, 'test', 2, 1000)).toBe(true);
    expect(await allow(req, 'test', 2, 1000)).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(await allow(req, 'test', 2, 1000)).toBe(true);
  });

  it('cuenta por separado cada IP y cada ámbito', async () => {
    const { allow } = await load();
    expect(await allow(request('1.1.1.1'), 'a', 1)).toBe(true);
    expect(await allow(request('2.2.2.2'), 'a', 1)).toBe(true);
    expect(await allow(request('1.1.1.1'), 'b', 1)).toBe(true);
    expect(await allow(request('1.1.1.1'), 'a', 1)).toBe(false);
  });
});
