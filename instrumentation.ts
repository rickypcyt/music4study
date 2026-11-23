// Solo en desarrollo: al arrancar `next dev`, pide una vez las rutas principales para que Next las compile
// en segundo plano. Así la primera visita no espera ~20 s a que se compile /api/auth (get-session).
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'development') return;

  const port = process.env.PORT ?? '3000';
  const base = `http://localhost:${port}`;
  const paths = ['/api/auth/get-session', '/api/links?scope=auto', '/api/stats', '/'];

  setTimeout(async () => {
    for (const p of paths) {
      try {
        await fetch(base + p, { cache: 'no-store' });
      } catch {
        /* el servidor aún no escucha o el puerto es otro: no pasa nada */
      }
    }
  }, 1500);
}
