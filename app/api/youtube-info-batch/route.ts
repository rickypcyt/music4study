import { NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MAX_BATCH_SIZE = 50; // YouTube API allows up to 50 videos per request

/**
 * Batch endpoint to fetch multiple YouTube video info in one API call
 * This reduces API quota usage and improves performance
 * 
 * Usage: /api/youtube-info-batch?videoIds=id1,id2,id3
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoIdsParam = searchParams.get('videoIds');

  if (!videoIdsParam) {
    return NextResponse.json(
      { error: 'Missing videoIds parameter (comma-separated)' },
      { status: 400 }
    );
  }

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json(
      { error: 'YouTube API key not configured' },
      { status: 500 }
    );
  }

  // Parse and validate video IDs
  const videoIds = videoIdsParam
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0)
    .slice(0, MAX_BATCH_SIZE); // Limit to max batch size

  if (videoIds.length === 0) {
    return NextResponse.json(
      { error: 'No valid video IDs provided' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      const errorMessage = errorData?.error?.message || response.statusText;
      console.error(`YouTube API batch error (${response.status}):`, errorMessage);
      return NextResponse.json(
        { error: errorMessage, status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Map results by video ID for easy lookup
    const results: Record<string, { title: string; channelTitle: string }> = {};

    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: { id: string; snippet?: { title: string; channelTitle?: string } }) => {
        if (item.snippet) {
          results[item.id] = {
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle || '',
          };
        }
      });
    }

    // Return with cache headers
    return NextResponse.json(
      results,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching YouTube video info batch:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

