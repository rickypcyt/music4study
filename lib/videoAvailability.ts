import { supabase } from './supabase';

interface VideoCheckResult {
  isAvailable: boolean;
  error?: string;
}

export async function checkVideoAvailability(videoId: string): Promise<VideoCheckResult> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (!response.ok) {
      return {
        isAvailable: false,
        error: response.status === 404 ? 'Video not found' : 'Video unavailable'
      };
    }

    return { isAvailable: true };
  } catch (error) {
    console.error('Error checking video availability:', error);
    return {
      isAvailable: false,
      error: 'Error checking video availability'
    };
  }
}

export async function removeUnavailableVideo(linkId: string): Promise<void> {
  try {
    // First remove any references in combinations
    await supabase
      .from('combination_links')
      .delete()
      .eq('link_id', linkId);

    // Then remove the link itself
    await supabase
      .from('links')
      .delete()
      .eq('id', linkId);

    console.log(`Successfully removed unavailable video with ID: ${linkId}`);
  } catch (error) {
    console.error('Error removing unavailable video:', error);
    throw error;
  }
}

export async function checkAndRemoveUnavailableVideos(): Promise<void> {
  try {
    // Get all YouTube links
    const { data: links, error } = await supabase
      .from('links')
      .select('id, url')
      .or('url.ilike.%youtube.com%,url.ilike.%youtu.be%');

    if (error) throw error;

    for (const link of links) {
      const videoId = extractYouTubeId(link.url);
      if (!videoId) continue;

      const { isAvailable, error: checkError } = await checkVideoAvailability(videoId);
      
      if (!isAvailable) {
        console.log(`Video ${videoId} is unavailable: ${checkError}`);
        await removeUnavailableVideo(link.id);
      }
    }
  } catch (error) {
    console.error('Error in checkAndRemoveUnavailableVideos:', error);
    throw error;
  }
}

// Utility function to extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
} 