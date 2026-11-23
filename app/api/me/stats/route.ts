import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserStats } from '@/lib/userStats';

export const dynamic = 'force-dynamic';

/** GET /api/me/stats -> estadísticas de la biblioteca del usuario con sesión (1 consulta, caché 30 s) */
export async function GET(request: Request) {
  try {
    const session = await getSession(request); // con cookie de sesión cacheada: sin consulta a la base de datos
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const stats = await getUserStats(session.user.id);

    return NextResponse.json(
      {
        user: {
          name: session.user.name,
          username: session.user.username ?? null,
          email: session.user.email,
          image: session.user.image ?? null,
          memberSince: session.user.createdAt,
        },
        ...stats,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }, // son datos personales: nunca en una caché compartida
    );
  } catch (error) {
    console.error('GET /api/me/stats:', error);
    return NextResponse.json({ error: 'Error al leer las estadísticas' }, { status: 500 });
  }
}
