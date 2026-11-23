import AppHome from '@/components/app/AppHome';
import LandingPage from '@/components/landing/LandingPage';
import { auth } from '@/lib/auth';
import { getLandingStats } from '@/lib/stats';
import { headers } from 'next/headers';

// Depende de la cookie de sesión: el servidor decide qué mostrar
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * "/" muestra la APP (tu biblioteca) si hay sesión, y la LANDING si no.
 * Ambas se deciden en el servidor, así no hay parpadeo ni se descarga código de la app a quien solo visita.
 */
export default async function Page({ searchParams }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) return <AppHome searchParams={searchParams} />;

  // Los datos llegan ya calculados (una sola consulta, con caché) dentro del HTML inicial
  const stats = await getLandingStats();
  return <LandingPage initialStats={stats} />;
}
