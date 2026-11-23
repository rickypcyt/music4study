import './globals.css';

import type { Metadata } from 'next';
import PageTransition from '@/components/ui/PageTransition';
import PerformanceMonitor from '@/components/ui/PerformanceMonitor';
import ResourcePreloader from '@/components/ResourcePreloader';
import SpotifyScript from '@/components/embeds/SpotifyScript';
import { Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import ClientProvider from '@/components/ClientProvider';
import { cn } from '@/lib/utils';
import { config } from '@/lib/config';

export const metadata: Metadata = {
  title: {
    default: 'Music4Study — Study Music for Students | Lo-fi, Ambient & Focus Playlists',
    template: '%s | Music4Study'
  },
  description: 'Study music curated by students. Save YouTube, Spotify and SoundCloud tracks, organize lo-fi, ambient, classical and jazz by genre, and build focus playlists for reading, exams and late-night sessions.',
  keywords: ['study music', 'focus music', 'study playlist', 'background music', 'study soundtrack', 'music for studying', 'concentration music', 'productivity music', 'lo-fi study music', 'ambient study music', 'classical study music', 'jazz study music', 'relaxing music for studying', 'study beats', 'pomodoro music', 'deep focus music', 'calm music for study', 'instrumental study music'],
  authors: [{ name: 'Music4Study Team' }],
  creator: 'Music4Study',
  publisher: 'Music4Study',
  category: 'Music & Audio',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(config.siteUrl),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/m4sico.ico', sizes: 'any' },
      { url: '/m4sico.ico', type: 'image/x-icon', sizes: '32x32' },
      { url: '/m4spng.png', type: 'image/png', sizes: '192x192' },
      { url: '/m4spng.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/m4sico.ico',
    apple: '/m4spng.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Music4Study — Study Music for Students',
    description: 'Study music curated by students: lo-fi, ambient, classical, jazz and more. Build focus playlists for reading, exams and late-night sessions.',
    url: config.siteUrl,
    siteName: 'Music4Study',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Music4Study — Study Music for Students',
    description: 'Study music curated by students: lo-fi, ambient, classical, jazz and more.',
    creator: '@music4study',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'emfPXJ9fdKnImVBYpVMGTCGINjQH1rj_n8BwFitFpuI',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a1814',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="emfPXJ9fdKnImVBYpVMGTCGINjQH1rj_n8BwFitFpuI" />
        <SpotifyScript />
        <ResourcePreloader />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <meta name="application-name" content="Music4Study" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Music4Study" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="color-scheme" content="dark" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  '@id': `${config.siteUrl}/#website`,
                  name: 'Music4Study',
                  url: config.siteUrl,
                  inLanguage: 'en',
                  description: 'Study music curated by students: lo-fi, ambient, classical, jazz and more.',
                },
                {
                  '@type': 'Organization',
                  '@id': `${config.siteUrl}/#organization`,
                  name: 'Music4Study',
                  url: config.siteUrl,
                  logo: `${config.siteUrl}/m4spng.png`,
                },
              ],
            }),
          }}
        />
      </head>
      <body className={cn(
        "min-h-screen bg-[#1a1814] text-[#e6e2d9] antialiased font-sans"
      )}>
          <ClientProvider>
            <Suspense fallback={<div className="min-h-screen" aria-hidden="true" />}>
              <PageTransition>
                {children}
              </PageTransition>
            </Suspense>
          </ClientProvider>
        <Toaster />
        <PerformanceMonitor />
      </body>
    </html>
  );
}
