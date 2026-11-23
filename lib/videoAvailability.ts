// SOLO SERVIDOR (usa la base de datos). Lo llaman /api/cron/check-videos y /api/check-videos.
import { db, links } from '@/db';
import { eq, or, ilike } from 'drizzle-orm';
import { extractYouTubeId } from '@/lib/youtubeId';

interface VideoCheckResult {
  isAvailable: boolean;
  error?: string;
}

export async function checkVideoAvailability(videoId: string): Promise<VideoCheckResult> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`,
    );
    if (!response.ok) {
      // 401 = embebido deshabilitado por el dueño (el video existe): no se considera caído
      if (response.status === 401) return { isAvailable: true };
      return { isAvailable: false, error: response.status === 404 ? 'Video not found' : 'Video unavailable' };
    }
    return { isAvailable: true };
  } catch (error) {
    console.error('Error checking video availability:', error);
    // Error de red: no borrar nada por precaución
    return { isAvailable: true, error: 'Error checking video availability' };
  }
}

export async function removeUnavailableVideo(linkId: string): Promise<void> {
  // combination_links se borra en cascada
  await db.delete(links).where(eq(links.id, linkId));
  console.log(`Removed unavailable video with ID: ${linkId}`);
}

export async function checkAndRemoveUnavailableVideos(): Promise<void> {
  const rows = await db
    .select({ id: links.id, url: links.url })
    .from(links)
    .where(or(ilike(links.url, '%youtube.com%'), ilike(links.url, '%youtu.be%')));

  for (const link of rows) {
    const videoId = extractYouTubeId(link.url);
    if (!videoId) continue;
    const { isAvailable, error } = await checkVideoAvailability(videoId);
    if (!isAvailable) {
      console.log(`Video ${videoId} is unavailable: ${error}`);
      await removeUnavailableVideo(link.id);
    }
  }
}
