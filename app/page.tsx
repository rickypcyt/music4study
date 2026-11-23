import type { Metadata } from 'next';
import { FAQ } from '@/components/landing/content';
import { config } from '@/lib/config';
import AppHome from '@/components/app/AppHome';
import LandingPage from '@/components/landing/LandingPage';
import { auth } from '@/lib/auth';
import { getLandingStats } from '@/lib/stats';
import { headers } from 'next/headers';

export const metadata: Metadata = {
  title: { absolute: 'Music4Study — Study Music for Students | Lo-fi, Ambient & Focus Playlists' },
  description:
    'Study music curated by students. Save YouTube, Spotify and SoundCloud tracks, organize lo-fi, ambient, classical and jazz by genre, and build focus playlists for reading, exams and late-night sessions.',
  alternates: { canonical: '/' },
};

// Datos estructurados de la landing: el FAQ es el mismo texto que se ve en la página
const landingJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Music4Study',
      url: config.siteUrl,
      applicationCategory: 'MusicApplication',
      operatingSystem: 'Any',
      audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
      description: 'A library of study music made by students: save YouTube, Spotify and SoundCloud tracks and build focus playlists.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ],
};

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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }} />
      <LandingPage initialStats={stats} />
    </>
  );
}
