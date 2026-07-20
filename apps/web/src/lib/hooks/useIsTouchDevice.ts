'use client';
import { useState, useEffect } from 'react';

function detectTouch(): boolean {
  if (typeof window === 'undefined') return false; // SSR: sin window, se resuelve en cliente
  return window.matchMedia('(pointer: coarse)').matches
    || navigator.maxTouchPoints > 0
    || 'ontouchstart' in window;
}

/**
 * Detecta dispositivos táctiles de forma robusta: no se basa en ancho de
 * viewport (hay tablets/desktops grandes con touch, y móviles con ancho
 * grande), sino en soporte real de puntero táctil.
 *
 * El valor inicial de useState ya corre `detectTouch()` de forma síncrona
 * en el primer render de cliente (el inicializador de useState se evalúa
 * durante el render, no en un efecto). Esto evita que el lightbox se abra
 * primero con el layout de escritorio y "salte" al layout mobile un
 * instante después — en SSR sigue devolviendo `false` de forma segura
 * porque `window` no existe ahí, y React re-renderiza con el valor real
 * apenas hidrata (mismo mecanismo que evitaba el mismatch antes).
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(detectTouch);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const check = () => setIsTouch(detectTouch());
    check();
    mq.addEventListener('change', check);
    return () => mq.removeEventListener('change', check);
  }, []);

  return isTouch;
}
