import { NextResponse } from 'next/server';
import { getLandingStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

/** GET /api/stats — estadísticas públicas para la landing (una consulta, caché de 10 s en servidor y 5 s en CDN). */
export async function GET() {
  try {
    const stats = await getLandingStats();
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15' },
    });
  } catch (error) {
    console.error('GET /api/stats:', error);
    return NextResponse.json({ error: 'Error al leer las estadísticas' }, { status: 500 });
  }
}
