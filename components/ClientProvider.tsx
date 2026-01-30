'use client';

import { AudioProvider } from '@/contexts/AudioContext';
import AudioControls from '@/components/AudioControls';
import GlobalYouTubePlayer from '@/components/embeds/BackgroundPlayer';
import { useEffect, useState } from 'react';

export default function ClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Prevent hydration mismatch by waiting for client-side hydration
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <AudioProvider>
      {children}
      {/* Global YouTube player - stays mounted for background playback */}
      <div className="fixed top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none z-0">
        <GlobalYouTubePlayer />
      </div>
      {isHydrated && <AudioControls />}
    </AudioProvider>
  );
}