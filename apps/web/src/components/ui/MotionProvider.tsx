'use client';
import { useEffect } from 'react';

/**
 * MotionProvider
 * Activa las clases .reveal, .reveal-left, .reveal-right, .reveal-scale
 * cuando los elementos entran en el viewport.
 * Debe ir en el layout principal de la web.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const CLASSES = ['.reveal', '.reveal-left', '.reveal-right', '.reveal-scale'];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    // Observar todos los elementos con clases de animación
    const observe = () => {
      CLASSES.forEach((cls) => {
        document.querySelectorAll(cls).forEach((el) => observer.observe(el));
      });
    };

    // Observar inmediatamente y de nuevo cuando el DOM cambie
    observe();
    const mutationObserver = new MutationObserver(observe);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return <>{children}</>;
}
