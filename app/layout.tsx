import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import InitialLoadingScreen from '@/components/ui/InitialLoadingScreen';
import SpotifyScript from '@/components/embeds/SpotifyScript';

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

export const metadata = {
  title: {
    default: 'Music4Study - Curated Music for Studying',
    template: '%s | Music4Study'
  },
  description: 'Discover the perfect study music. Browse curated playlists, explore genres, and find the ideal soundtrack for your study sessions. Enhance focus and productivity with Music4Study.',
  keywords: ['study music', 'focus music', 'study playlist', 'background music', 'study soundtrack', 'music for studying', 'concentration music', 'productivity music'],
  authors: [{ name: 'Music4Study Team' }],
  creator: 'Music4Study',
  publisher: 'Music4Study',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://music4study.com'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/m4sico.ico', sizes: 'any' },
      { url: '/m4sico.ico', type: 'image/x-icon', sizes: '32x32' },
    ],
    shortcut: '/m4sico.ico',
  },
  openGraph: {
    title: 'Music4Study - Curated Music for Studying',
    description: 'Discover the perfect study music. Browse curated playlists, explore genres, and find the ideal soundtrack for your study sessions.',
    url: 'https://music4study.com',
    siteName: 'Music4Study',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Music4Study - Curated Music for Studying',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Music4Study - Curated Music for Studying',
    description: 'Discover the perfect study music. Browse curated playlists, explore genres, and find the ideal soundtrack for your study sessions.',
    images: ['/twitter-image.png'],
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
    <html lang="en" className="h-full">
      <head>
        <meta name="google-site-verification" content="emfPXJ9fdKnImVBYpVMGTCGINjQH1rj_n8BwFitFpuI" />
        <SpotifyScript />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 min-h-screen flex flex-col`}>
        <Suspense fallback={<div>Loading...</div>}>
          {children}
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}
