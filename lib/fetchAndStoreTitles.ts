import { extractYouTubeId } from '@/components/embeds/LazyYouTubeEmbed';
import { supabase } from '@/lib/supabase';
import { youtubeCache } from '@/lib/youtubeCache';

interface Link {
  id: string;
  title: string;
  url: string;
  genre: string;
  type: string;
  username: string;
  date_added: string;
  titleConfirmedAt?: string; // Timestamp when title was last confirmed
}

/**
 * Normalize title text - remove extra whitespace, trim, and clean up
 */
function normalizeTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    return '';
  }
  return title
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, ' ') // Replace newlines with space
    .replace(/\t+/g, ' ') // Replace tabs with space
    .trim();
}

/**
 * Validate and sanitize title for database storage
 * Returns null if title is invalid
 */
function validateTitleForDB(title: string | null | undefined): string | null {
  if (!title || typeof title !== 'string') {
    return null;
  }
  
  const normalized = normalizeTitle(title);
  
  // Check if empty after normalization
  if (!normalized || normalized.trim().length === 0) {
    return null;
  }
  
  // Check max length (Supabase text fields typically support up to 255 chars, but let's be safe)
  const MAX_TITLE_LENGTH = 200;
  if (normalized.length > MAX_TITLE_LENGTH) {
    // Truncate to max length
    return normalized.substring(0, MAX_TITLE_LENGTH).trim();
  }
  
  return normalized;
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
  // Only process if: YouTube link AND (title is null OR title is invalid)
  const linksNeedingTitles = links.filter(link => {
    const isYouTube = link.url.includes('youtube.com') || link.url.includes('youtu.be');
    if (!isYouTube) return false;
    
    // Only fetch if title is null, undefined, or invalid
    return link.title === null || link.title === undefined || !isValidTitle(link.title);
  });

  if (linksNeedingTitles.length === 0) {
    return; // No links need titles
  }

  // Extract video IDs and create a map
  const videoIdToLink = new Map<string, Link>();
  const videoIds: string[] = [];
  const videoIdsNeedingFetch: string[] = [];
  const updatePromisesFromCache: Array<Promise<{ error: unknown; data: unknown }>> = [];

  // Check cache first for each video
  for (const link of linksNeedingTitles) {
    const videoId = extractYouTubeId(link.url);
    if (!videoId || videoIdToLink.has(videoId)) continue;
    
    videoIdToLink.set(videoId, link);
    videoIds.push(videoId);

    // Check cache first
    const cached = youtubeCache.get(videoId);
    if (cached && cached.title) {
      // Use cached title - always update database to ensure it's stored
      const validatedTitle = validateTitleForDB(cached.title);
      if (validatedTitle) {
        // Always update Supabase with cached title (even if it's the same)
        // This ensures the title is stored in the database
        updatePromisesFromCache.push(
          supabase
            .from('links')
            .update({ title: validatedTitle })
            .eq('id', link.id)
            .select()
            .then(({ error, data }) => {
              if (error) {
                console.warn(
                  `Failed to update cached title in Supabase for link ${link.id} (${link.url}):`,
                  error.message,
                  error.details || '',
                  error.hint || ''
                );
              } else {
                // Successfully saved to Supabase
                if (process.env.NODE_ENV === 'development') {
                  console.log(`✓ Saved cached title to Supabase`);
                }
              }
              return { error: error as unknown, data: data as unknown };
            }) as Promise<{ error: unknown; data: unknown }>
        );
      }
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
      const updatePromises: Array<Promise<{ error: unknown; data: unknown }>> = [];

      for (const [videoId, videoInfo] of Object.entries(results)) {
        const link = videoIdToLink.get(videoId);
        if (link && videoInfo.title) {
          // Validate and normalize the title before storing
          const validatedTitle = validateTitleForDB(videoInfo.title);
          
          // Skip if title is invalid after validation
          if (!validatedTitle) {
            console.warn(`Skipping update for video ${videoId}: invalid title after validation`);
            continue;
          }
          
          // Store in cache
          youtubeCache.set(videoId, validatedTitle, videoInfo.channelTitle || '');
          
          // Always update Supabase with the fetched title
          // This ensures the title is stored in the database
          updatePromises.push(
            supabase
              .from('links')
              .update({ title: validatedTitle })
              .eq('id', link.id)
              .select()
              .then(({ error, data }) => {
                if (error) {
                  console.warn(
                    `Failed to update title in Supabase for link ${link.id} (${link.url}):`,
                    error.message,
                    error.details || '',
                    error.hint || '',
                    `Title: "${validatedTitle.substring(0, 50)}..."`
                  );
                } else {
                  // Successfully saved to Supabase
                  if (process.env.NODE_ENV === 'development') {
                    console.log(`✓ Saved title to Supabase for video ${videoId}: "${validatedTitle.substring(0, 50)}..."`);
                  }
                }
                return { error: error as unknown, data: data as unknown };
              }) as Promise<{ error: unknown; data: unknown }>
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
  
  // Log total cached titles
  if (process.env.NODE_ENV === 'development' && linksNeedingTitles.length > 0) {
    console.log(`✓ Processed ${linksNeedingTitles.length} cached titles`);
  }
}

/**
 * Fetch and store titles for a single link
 * Only fetches if: link is YouTube AND title is null or invalid
 * Always saves to Supabase after fetching
 */
export async function fetchAndStoreTitle(link: Link): Promise<string | null> {
  // Only process YouTube links
  const isYouTube = link.url.includes('youtube.com') || link.url.includes('youtu.be');
  if (!isYouTube) return null;

  // Only fetch if title is null or invalid
  if (link.title !== null && link.title !== undefined && isValidTitle(link.title)) {
    return link.title; // Already has valid title, no need to fetch
  }

  const videoId = extractYouTubeId(link.url);
  if (!videoId) return null;

    // Check cache first
    const cached = youtubeCache.get(videoId);
    if (cached && cached.title) {
      // Use cached title - always update database to ensure it's stored
      const validatedTitle = validateTitleForDB(cached.title);
      if (validatedTitle) {
        // Always update Supabase with cached title (even if it's the same)
        // This ensures the title is stored in the database
        const { error } = await supabase
          .from('links')
          .update({ title: validatedTitle })
          .eq('id', link.id)
          .select();
        
        if (error) {
          console.warn(
            `Failed to update cached title in Supabase for link ${link.id} (${link.url}):`,
            error.message,
            error.details || '',
            error.hint || ''
          );
        } else {
          // Successfully saved to Supabase
          if (process.env.NODE_ENV === 'development') {
            console.log(`✓ Saved cached title to Supabase`);
          }
        }
      }
      return validatedTitle;
    }

  try {
    const response = await fetch(`/api/youtube-info?videoId=${videoId}`);
    if (!response.ok) {
      // Silently fail for 404 or 500 (API not configured or video not found)
      if (response.status === 404 || response.status === 500) {
        return null;
      }
      // Log other errors in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`YouTube API returned ${response.status} for video ${videoId}`);
      }
      return null;
    }

    const data = await response.json();
    if (data.title) {
      // Validate and normalize the title before storing
      const validatedTitle = validateTitleForDB(data.title);
      
      // Skip if title is invalid after validation
      if (!validatedTitle) {
        console.warn(`Skipping update for video ${videoId}: invalid title after validation`);
        return null;
      }
      
      // Store in cache first
      youtubeCache.set(videoId, validatedTitle, data.channelTitle || '');
      
      // Always update Supabase with the fetched title (even if it's the same)
      // This ensures the title is stored in the database
      const { error } = await supabase
        .from('links')
        .update({ title: validatedTitle })
        .eq('id', link.id)
        .select();

      if (error) {
        console.warn(
          `Failed to update title in Supabase for link ${link.id} (${link.url}):`,
          error.message,
          error.details || '',
          error.hint || '',
          `Title: "${validatedTitle.substring(0, 50)}..."`
        );
      } else {
        // Successfully saved to Supabase
        if (process.env.NODE_ENV === 'development') {
          console.log(`✓ Saved title to Supabase`);
        }
      }

      return validatedTitle;
    }
  } catch (error) {
    console.error('Error fetching video title:', error);
  }

  return null;
}

