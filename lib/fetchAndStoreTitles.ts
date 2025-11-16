import { supabase } from '@/lib/supabase';
import { extractYouTubeId } from '@/components/embeds/LazyYouTubeEmbed';
import { youtubeCache } from '@/lib/youtubeCache';

interface Link {
  id: string;
  title: string;
  url: string;
  genre: string;
  type: string;
  username: string;
  date_added: string;
}

/**
 * Normalize title text - remove extra whitespace, trim, and clean up
 */
function normalizeTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, ' ') // Replace newlines with space
    .replace(/\t+/g, ' ') // Replace tabs with space
    .trim();
}

/**
 * Check if a title is valid (not a URL or empty)
 */
function isValidTitle(title: string | undefined | null): boolean {
  if (!title || !title.trim()) return false;
  // Don't consider URLs as valid titles
  if (title.includes('youtube.com') || title.includes('youtu.be') || title.startsWith('http')) {
    return false;
  }
  return true;
}

/**
 * Automatically fetch and store YouTube video titles for links that need them
 * Uses batch API for efficiency
 */
export async function fetchAndStoreTitles(links: Link[]): Promise<void> {
  // Filter YouTube links that need titles
  const linksNeedingTitles = links.filter(link => {
    const isYouTube = link.url.includes('youtube.com') || link.url.includes('youtu.be');
    if (!isYouTube) return false;
    
    // Check if title is missing or invalid
    return !isValidTitle(link.title);
  });

  if (linksNeedingTitles.length === 0) {
    return; // No links need titles
  }

  // Extract video IDs and create a map
  const videoIdToLink = new Map<string, Link>();
  const videoIds: string[] = [];
  const videoIdsNeedingFetch: string[] = [];
  const updatePromisesFromCache: Promise<any>[] = [];

  // Check cache first for each video
  for (const link of linksNeedingTitles) {
    const videoId = extractYouTubeId(link.url);
    if (!videoId || videoIdToLink.has(videoId)) continue;
    
    videoIdToLink.set(videoId, link);
    videoIds.push(videoId);

    // Check cache first
    const cached = youtubeCache.get(videoId);
    if (cached && cached.title) {
      // Use cached title - update database
      const normalizedTitle = normalizeTitle(cached.title);
      updatePromisesFromCache.push(
        supabase
          .from('links')
          .update({ title: normalizedTitle })
          .eq('id', link.id)
      );
    } else {
      // Need to fetch from API
      videoIdsNeedingFetch.push(videoId);
    }
  }

  // Wait for cache-based updates to complete
  if (updatePromisesFromCache.length > 0) {
    await Promise.allSettled(updatePromisesFromCache);
  }

  if (videoIdsNeedingFetch.length === 0) {
    return; // All titles were in cache
  }

  // Fetch titles in batches (max 50 per request)
  const BATCH_SIZE = 50;
  const batches: string[][] = [];
  
  for (let i = 0; i < videoIdsNeedingFetch.length; i += BATCH_SIZE) {
    batches.push(videoIdsNeedingFetch.slice(i, i + BATCH_SIZE));
  }

  // Process each batch
  for (const batch of batches) {
    try {
      const response = await fetch(
        `/api/youtube-info-batch?videoIds=${batch.join(',')}`
      );

      if (!response.ok) {
        console.warn('Failed to fetch batch of video titles:', response.status);
        continue;
      }

      const results: Record<string, { title: string; channelTitle: string }> = 
        await response.json();

      // Update database and cache for each video that got a title
      const updatePromises: Promise<any>[] = [];

      for (const [videoId, videoInfo] of Object.entries(results)) {
        const link = videoIdToLink.get(videoId);
        if (link && videoInfo.title) {
          // Normalize the title before storing
          const normalizedTitle = normalizeTitle(videoInfo.title);
          
          // Store in cache
          youtubeCache.set(videoId, normalizedTitle, videoInfo.channelTitle || '');
          
          // Update the link in the database
          updatePromises.push(
            supabase
              .from('links')
              .update({ title: normalizedTitle })
              .eq('id', link.id)
          );
        }
      }

      // Wait for all updates to complete
      await Promise.allSettled(updatePromises);
    } catch (error) {
      console.error('Error fetching/updating video titles:', error);
      // Continue with next batch even if this one fails
    }
  }
}

/**
 * Fetch and store titles for a single link
 */
export async function fetchAndStoreTitle(link: Link): Promise<string | null> {
  const isYouTube = link.url.includes('youtube.com') || link.url.includes('youtu.be');
  if (!isYouTube) return null;

  // Check if title is already valid
  if (isValidTitle(link.title)) {
    return link.title;
  }

  const videoId = extractYouTubeId(link.url);
  if (!videoId) return null;

  // Check cache first
  const cached = youtubeCache.get(videoId);
  if (cached && cached.title) {
    // Use cached title - update database if needed
    const normalizedTitle = normalizeTitle(cached.title);
    if (normalizedTitle !== link.title) {
      // Update database with cached title
      await supabase
        .from('links')
        .update({ title: normalizedTitle })
        .eq('id', link.id);
    }
    return normalizedTitle;
  }

  try {
    const response = await fetch(`/api/youtube-info?videoId=${videoId}`);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.title) {
      // Normalize the title before storing
      const normalizedTitle = normalizeTitle(data.title);
      
      // Store in cache
      youtubeCache.set(videoId, normalizedTitle, data.channelTitle || '');
      
      // Update the database
      await supabase
        .from('links')
        .update({ title: normalizedTitle })
        .eq('id', link.id);

      return normalizedTitle;
    }
  } catch (error) {
    console.error('Error fetching video title:', error);
  }

  return null;
}

