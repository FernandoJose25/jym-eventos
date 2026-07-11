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
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyTouchAction: body.style.touchAction,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
    };
    // El scroll real vive en <html> (no fija overflow-y propio), así que
    // hay que bloquear ambos elementos. Además, en iOS Safari overflow:hidden
    // no basta para frenar el swipe táctil de fondo — se fija el body en
    // su posición actual con position:fixed, que sí lo bloquea de forma
    // confiable, y se restaura el scroll exacto al desmontar.
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.touchAction = prev.bodyTouchAction;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
