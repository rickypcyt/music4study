import './globals.css';

import { Geist, Geist_Mono } from 'next/font/google';

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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: 'Music4Study - Curated Music for Studying | Focus & Concentration Playlists',
    template: '%s | Music4Study'
  },
  description: 'Discover the perfect study music. Browse curated YouTube, Spotify, and SoundCloud playlists, explore genres like Lo-Fi, Ambient, Classical, and Jazz, and find the ideal soundtrack for your study sessions. Enhance focus and productivity with Music4Study.',
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
    languages: {
      'en-US': '/',
      'es-ES': '/',
    },
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
    title: 'Music4Study - Curated Music for Studying',
    description: 'Discover the perfect study music. Browse curated playlists, explore genres, and find the ideal soundtrack for your study sessions. Lo-Fi, Ambient, Classical, Jazz and more.',
    url: config.siteUrl,
    siteName: 'Music4Study',
    images: [
      {
        url: '/m4spng.png',
        width: 1200,
        height: 630,
        alt: 'Music4Study - Curated Music for Studying',
      },
    ],
    locale: 'en_US',
    alternateLocale: ['es_ES'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Music4Study - Curated Music for Studying',
    description: 'Discover the perfect study music. Browse curated playlists, explore genres, and find the ideal soundtrack for your study sessions.',
    images: ['/m4spng.png'],
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
  maximumScale: 1,
  userScalable: false,
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1a1814" />
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
              '@type': 'WebSite',
              name: 'Music4Study',
              url: config.siteUrl,
              description: 'Discover the perfect study music. Browse curated playlists, explore genres, and find the ideal soundtrack for your study sessions.',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${config.siteUrl}/?genre={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'MusicPlaylist',
              name: 'Music4Study - Study Music Collection',
              description: 'A curated collection of study music across genres including Lo-Fi, Ambient, Classical, Jazz, and more. Features YouTube, Spotify, and SoundCloud tracks.',
              url: config.siteUrl,
              creator: {
                '@type': 'Organization',
                name: 'Music4Study',
                url: config.siteUrl,
              },
            }),
          }}
        />
      </head>
      <body className={cn(
        "min-h-screen bg-[#1a1814] text-[#e6e2d9] antialiased",
        geistSans.variable,
        geistMono.variable
      )}>
          <ClientProvider>
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-screen">
                <div className="animate-pulse text-foreground/70">Loading...</div>
              </div>
            }>
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
