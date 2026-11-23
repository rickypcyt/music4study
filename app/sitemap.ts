import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';
import { listPublicUsernames } from '@/lib/explore';

// Solo URLs indexables y distintas. Las vistas internas (?view=genres, ?view=combinations) requieren sesión
// y para un buscador devuelven la misma landing, así que no se listan.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: config.siteUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${config.siteUrl}/explore`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
  ];

  try {
    const usernames = await listPublicUsernames();
    return [
      ...base,
      ...usernames.map((u) => ({
        url: `${config.siteUrl}/u/${encodeURIComponent(u)}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // Si la base de datos no responde, el sitemap sigue sirviendo las páginas fijas
    return base;
  }
}
