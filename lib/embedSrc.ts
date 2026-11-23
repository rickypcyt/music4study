import { extractYouTubeId } from '@/lib/youtubeId';

/** URL del reproductor embebido (autoplay) según la plataforma del link, o null si no se puede embeber. */
export function embedSrc(url: string): string | null {
  const yt = extractYouTubeId(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('spotify.com')) {
      const m = u.pathname.match(/\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
      return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0` : null;
    }
    if (u.hostname.endsWith('soundcloud.com')) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=true&visual=true&hide_related=true&show_comments=false`;
    }
  } catch {
    /* url inválida */
  }
  return null;
}
