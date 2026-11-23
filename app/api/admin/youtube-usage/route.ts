import { DAILY_BUDGET, usageHistory, usageToday } from '@/lib/youtubeApi';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/youtube-usage -> uso de la cuota de la API de YouTube (solo administrador).
 * La cuota oficial (10.000 unidades/día por defecto) se mide en Google Cloud; esto cuenta las llamadas de esta app.
 */
export async function GET(request: Request) {
  const session = await getSession(request);
  const admin = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '').trim().toLowerCase();
  if (!session?.user || !admin || session.user.email.toLowerCase() !== admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [today, history] = await Promise.all([usageToday(), usageHistory(7)]);
  return NextResponse.json({
    today,
    dailyBudget: DAILY_BUDGET,
    percentOfBudget: Math.round((today / DAILY_BUDGET) * 1000) / 10,
    googleDefaultQuota: 10000,
    last7days: history,
  });
}
