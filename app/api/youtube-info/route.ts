import { NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return new NextResponse('Missing videoId parameter', { status: 400 });
  }

  if (!YOUTUBE_API_KEY) {
    return new NextResponse('YouTube API key not configured', { status: 500 });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.items?.[0]?.snippet) {
      return new NextResponse('Video not found', { status: 404 });
    }

    const { title, channelTitle } = data.items[0].snippet;

    return NextResponse.json({ title, channelTitle });
  } catch (error) {
    console.error('Error fetching YouTube video info:', error);
    return new NextResponse('Failed to fetch video info', { status: 500 });
  }
} 