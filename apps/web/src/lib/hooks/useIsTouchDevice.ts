'use client';
import { useState, useEffect } from 'react';

/**
 * Detecta dispositivos táctiles de forma robusta: no se basa en ancho de
 * viewport (hay tablets/desktops grandes con touch, y móviles con ancho
 * grande), sino en soporte real de puntero táctil. SSR-safe: arranca en
 * `false` y se corrige en el primer efecto en cliente para evitar mismatch
 * de hidratación.
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const check = () =>
      setIsTouch(mq.matches || navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
    check();
    mq.addEventListener('change', check);
    return () => mq.removeEventListener('change', check);
  }, []);

  return isTouch;
}
