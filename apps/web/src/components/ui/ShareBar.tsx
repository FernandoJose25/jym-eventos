'use client';
import { useState, useEffect, useRef } from 'react';

interface ShareBarProps {
  itemId: string;
  title?: string;
  imageUrl?: string; // imagen real para compartir como archivo (Instagram Stories/TikTok)
}

export function ShareBar({ itemId, title, imageUrl }: ShareBarProps) {
  const [open,    setOpen]    = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [igToast, setIgToast] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // URL con OG tags server-side → Facebook/WhatsApp leen og:image con la foto real
  const getShareUrl = () =>
    typeof window !== 'undefined'
      ? `${window.location.origin}/foto/${itemId}`
      : `https://jym-eventos-web.vercel.app/foto/${itemId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(getShareUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  const platforms = [
    {
      label: 'Facebook',
      bg: '#1877f2',
      onClick: () => window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`,
        '_blank'
      ),
      icon: (
        <svg viewBox="0 0 24 24" fill="#fff" width={22} height={22}>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
        </svg>
      ),
    },
    {
      label: 'WhatsApp',
      bg: '#25d366',
      onClick: () => window.open(
        `https://wa.me/?text=${encodeURIComponent(
          `${title ? title + ' · ' : ''}J&M Eventos y Decoraciones — Sechura, Piura 🎉\n${getShareUrl()}`
        )}`,
        '_blank'
      ),
      icon: (
        <svg viewBox="0 0 24 24" fill="#fff" width={22} height={22}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      ),
    },
    {
      label: 'Instagram',
      bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
      onClick: async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            // Intentar compartir como archivo → Instagram muestra Feed + Historias + Mensajes
            if (imageUrl && navigator.canShare) {
              const res  = await fetch(imageUrl);
              const blob = await res.blob();
              const ext  = blob.type.split('/')[1] || 'jpg';
              const file = new File([blob], `jym-eventos.${ext}`, { type: blob.type });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: title || 'J&M Eventos', url: getShareUrl() });
                return;
              }
            }
            // Fallback: solo URL → Instagram Mensajes
            await navigator.share({ title: title || 'J&M Eventos', url: getShareUrl() });
            return;
          } catch { /* usuario canceló */ }
        }
        navigator.clipboard.writeText(getShareUrl()).then(() => {
          setIgToast('¡Copiado! Pégalo en Instagram');
          setTimeout(() => setIgToast(null), 2500);
        });
      },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}
             strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      ),
    },
    {
      label: 'TikTok',
      bg: '#010101',
      onClick: async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            if (imageUrl && navigator.canShare) {
              const res  = await fetch(imageUrl);
              const blob = await res.blob();
              const ext  = blob.type.split('/')[1] || 'jpg';
              const file = new File([blob], `jym-eventos.${ext}`, { type: blob.type });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: title || 'J&M Eventos', url: getShareUrl() });
                return;
              }
            }
            await navigator.share({ title: title || 'J&M Eventos', url: getShareUrl() });
            return;
          } catch { /* usuario canceló */ }
        }
        navigator.clipboard.writeText(getShareUrl()).then(() => {
          setIgToast('¡Copiado! Pégalo en TikTok');
          setTimeout(() => setIgToast(null), 2500);
        });
      },
      icon: (
        <svg viewBox="0 0 24 24" fill="#fff" width={20} height={20}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* ── Botón trigger (ícono share) ── */}
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        title="Compartir"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: 12,
          padding: '7px 16px', borderRadius: 999,
          background: 'rgba(255,255,255,0.12)',
          border: '1.5px solid rgba(255,255,255,0.22)',
          color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
          transition: 'all .18s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.22)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'}
      >
        {/* Share icon (iOS style) */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
             strokeLinecap="round" strokeLinejoin="round" width={17} height={17}>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        Compartir
      </button>

      {/* ── Modal overlay ── */}
      {open && (
        <div
          onClick={e => { e.stopPropagation(); setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            ref={modalRef}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 20, padding: '2rem 2rem 1.75rem',
              width: '100%', maxWidth: 420,
              boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
              animation: 'shareModalIn .25s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.72rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', margin: 0 }}>
                  Compartir
                </p>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#0a1628', lineHeight: 1.3 }}>
                  {title || 'J&M Eventos y Decoraciones'}
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: '#f0f0f0', cursor: 'pointer', fontSize: '1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >✕</button>
            </div>

            {/* Link field */}
            <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>
              Enlace a compartir
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#f5f6f8', borderRadius: 12, padding: '10px 12px',
              marginBottom: '1.5rem', border: '1.5px solid #e8e8e8',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth={2}
                   strokeLinecap="round" strokeLinejoin="round" width={16} height={16} style={{ flexShrink: 0 }}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span style={{
                flex: 1, fontSize: '0.72rem', color: '#444', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {getShareUrl()}
              </span>
              <button
                onClick={copyLink}
                style={{
                  flexShrink: 0, padding: '5px 12px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                  background: copied ? '#22c55e' : '#0a1628',
                  color: '#fff', transition: 'all .2s',
                }}
              >
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>

            {/* Toast Instagram/TikTok */}
            {igToast && (
              <div style={{
                textAlign: 'center', marginBottom: 10,
                fontSize: '0.75rem', fontWeight: 600, color: '#22c55e',
              }}>
                ✅ {igToast}
              </div>
            )}

            {/* Social icons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              {platforms.map(p => (
                <div key={p.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={p.onClick}
                    title={p.label}
                    style={{
                      width: 56, height: 56, borderRadius: '50%', border: 'none',
                      background: p.bg, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      transition: 'transform .18s, box-shadow .18s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px) scale(1.07)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = '';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                  >
                    {p.icon}
                  </button>
                  <span style={{ fontSize: '0.65rem', color: '#666', fontWeight: 600 }}>{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shareModalIn {
          from { opacity: 0; transform: scale(0.9) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
