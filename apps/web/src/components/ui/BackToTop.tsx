'use client';
import { useEffect, useState } from 'react';

/* Botón dorado "volver arriba": aparece tras bajar ~2 pantallas. Va a la
   izquierda porque la esquina derecha pertenece al widget de WhatsApp. */
export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let raf = 0;
    const h = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setShow(window.scrollY > window.innerHeight * 1.8));
    };
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', h); };
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Volver arriba"
      style={{
        position: 'fixed', left: 16, bottom: 'calc(18px + env(safe-area-inset-bottom))', zIndex: 80,
        width: 46, height: 46, borderRadius: '50%', border: '1px solid rgba(245,200,66,0.4)',
        background: 'rgba(10,22,40,0.82)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        color: '#f5c842', fontSize: '1.05rem', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 12px rgba(212,160,23,0.15)',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(14px)',
        pointerEvents: show ? 'auto' : 'none',
        transition: 'opacity .4s cubic-bezier(.16,1,.3,1), transform .4s cubic-bezier(.16,1,.3,1), background .25s',
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'linear-gradient(135deg,#b8860b,#f5c842)'; el.style.color = '#0a1628'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(10,22,40,0.82)'; el.style.color = '#f5c842'; }}
    >
      ↑
    </button>
  );
}
