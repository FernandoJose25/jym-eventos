'use client';
import { useEffect } from 'react';

/**
 * Bloquea el scroll del body mientras `locked` es true — usado por los
 * lightbox de galería para que la ruedita del mouse / el swipe táctil no
 * sigan desplazando la página de fondo mientras se ve una foto o video.
 */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const { overflow, touchAction } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.touchAction = touchAction;
    };
  }, [locked]);
}
