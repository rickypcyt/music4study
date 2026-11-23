// Cambia la URL (?view=, ?genre=, ?sort=) sin pedirle nada al servidor.
// Next.js sincroniza window.history.pushState/replaceState con useSearchParams/usePathname,
// así que los componentes se actualizan igual, pero sin el viaje de red de router.replace().
export function replaceUrl(url: string) {
  if (typeof window === 'undefined') return;
  window.history.replaceState(null, '', url);
}

export function pushUrl(url: string) {
  if (typeof window === 'undefined') return;
  window.history.pushState(null, '', url);
}
