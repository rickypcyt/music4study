'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Miniatura de YouTube en HD con respaldo a hqdefault.
 * maxresdefault no existe en todos los videos (404) y, si la imagen falla antes de la hidratación,
 * React nunca recibe onError; por eso también se comprueba `complete` al montar.
 */
export default function YouTubeThumb({ videoId, className }: { videoId: string; className?: string }) {
  const ref = useRef<HTMLImageElement>(null);

  const fallback = useCallback(
    (img: HTMLImageElement) => {
      if (img.src.includes('maxresdefault')) img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      else img.style.visibility = 'hidden';
    },
    [videoId],
  );

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth <= 120) fallback(img);
  }, [fallback]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      key={videoId}
      src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
      alt=""
      loading="lazy"
      className={className}
      onLoad={(e) => {
        // Algunos videos devuelven un placeholder de 120x90 en vez de un 404
        if (e.currentTarget.naturalWidth <= 120) fallback(e.currentTarget);
      }}
      onError={(e) => fallback(e.currentTarget)}
    />
  );
}
