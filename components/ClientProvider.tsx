'use client';

import { useEffect, useRef } from 'react';
import { AudioProvider } from '@/contexts/AudioContext';
import { IframeTargetProvider, useIframeTarget } from '@/contexts/IframeTargetContext';
import GlobalYouTubePlayer from '@/components/embeds/BackgroundPlayer';

function GlobalIframeSlot() {
  const ref = useRef<HTMLDivElement>(null);
  const { registerTarget, unregisterTarget, GLOBAL_KEY } = useIframeTarget();

  useEffect(() => {
    if (ref.current) registerTarget(GLOBAL_KEY, ref.current);
    return () => unregisterTarget(GLOBAL_KEY);
  }, [registerTarget, unregisterTarget, GLOBAL_KEY]);

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none z-0"
      aria-hidden
    />
  );
}

export default function ClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AudioProvider>
      <IframeTargetProvider>
        {children}
        <GlobalIframeSlot />
        <GlobalYouTubePlayer />
      </IframeTargetProvider>
    </AudioProvider>
  );
}
