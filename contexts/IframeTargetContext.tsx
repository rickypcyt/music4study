'use client';

import { createContext, useContext, useCallback, useRef, useState, type ReactNode } from 'react';

const GLOBAL_TARGET_KEY = '__global__';

/** Key for the "Currently Playing" modal slot; when registered, the player is shown in the modal */
export const CURRENTLY_PLAYING_MODAL_KEY = '__currently_playing_modal__';

type TargetMap = Map<string, HTMLElement | null>;

interface IframeTargetContextValue {
  registerTarget: (ownerId: string, element: HTMLElement | null) => void;
  unregisterTarget: (ownerId: string) => void;
  getTarget: (ownerId: string) => HTMLElement | null;
  GLOBAL_KEY: string;
  CURRENTLY_PLAYING_MODAL_KEY: string;
}

const IframeTargetContext = createContext<IframeTargetContextValue | null>(null);

export function IframeTargetProvider({ children }: { children: ReactNode }) {
  const targetsRef = useRef<TargetMap>(new Map());
  const [, setVersion] = useState(0);

  const registerTarget = useCallback((ownerId: string, element: HTMLElement | null) => {
    targetsRef.current.set(ownerId, element);
    setVersion((v) => v + 1);
  }, []);

  const unregisterTarget = useCallback((ownerId: string) => {
    targetsRef.current.delete(ownerId);
    setVersion((v) => v + 1);
  }, []);

  const getTarget = useCallback((ownerId: string): HTMLElement | null => {
    return targetsRef.current.get(ownerId) ?? null;
  }, []);

  return (
    <IframeTargetContext.Provider
      value={{
        registerTarget,
        unregisterTarget,
        getTarget,
        GLOBAL_KEY: GLOBAL_TARGET_KEY,
        CURRENTLY_PLAYING_MODAL_KEY,
      }}
    >
      {children}
    </IframeTargetContext.Provider>
  );
}

export function useIframeTarget() {
  const ctx = useContext(IframeTargetContext);
  if (!ctx) {
    return {
      registerTarget: () => {},
      unregisterTarget: () => {},
      getTarget: () => null as HTMLElement | null,
      GLOBAL_KEY: GLOBAL_TARGET_KEY,
      CURRENTLY_PLAYING_MODAL_KEY,
    };
  }
  return ctx;
}
