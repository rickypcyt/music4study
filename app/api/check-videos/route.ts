import { NextResponse } from 'next/server';
import { checkAndRemoveUnavailableVideos } from '@/lib/videoAvailability';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    // You should replace this with your actual secret token
    if (token !== process.env.API_SECRET_TOKEN) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await checkAndRemoveUnavailableVideos();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Video availability check completed' 
    });
  } catch (error) {
    console.error('Error in check-videos endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 