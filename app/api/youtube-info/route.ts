import { NextResponse } from 'next/server';
import { allow } from '@/lib/rateLimit';
import { getVideo } from '@/lib/youtubeApi';

export const dynamic = 'force-dynamic';

const VIDEO_ID = /^[A-Za-z0-9_-]{6,15}$/;

/** GET /api/youtube-info?videoId=… -> { title, channelTitle }. Cacheado 24 h por video y contado en api_usage. */
export async function GET(request: Request) {
  const videoId = new URL(request.url).searchParams.get('videoId');
  if (!videoId || !VIDEO_ID.test(videoId)) {
    return NextResponse.json({ error: 'videoId inválido' }, { status: 400 });
  }
  if (!(await allow(request, 'youtube-info', 60))) {
    return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 });
  }

  const v = await getVideo(videoId);
  if (v.status === 'missing') return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  if (v.status === 'unavailable') return NextResponse.json({ error: 'YouTube no disponible' }, { status: 503 });

  return NextResponse.json(
    { title: v.title, channelTitle: v.channelTitle },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
