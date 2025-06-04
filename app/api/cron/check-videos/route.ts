import { NextResponse } from 'next/server';
import { checkAndRemoveUnavailableVideos } from '@/lib/videoAvailability';

// This endpoint will be called by Vercel Cron Jobs
// Configure it in vercel.json to run daily
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // Verify that this is a cron job request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await checkAndRemoveUnavailableVideos();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Video availability check completed' 
    });
  } catch (error) {
    console.error('Error in cron check-videos endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 