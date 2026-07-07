'use client';
import { useState, useEffect, useRef } from 'react';
import { SITE_URL } from '@/lib/site';

interface ShareBarProps {
  itemId: string;
  title?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export function ShareBar({ itemId, title, imageUrl, videoUrl }: ShareBarProps) {
  const [open,        setOpen]        = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [toast,       setToast]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState<string | null>(null);
  const [prefetching, setPrefetching] = useState(false);
  const cachedFile    = useRef<File | null>(null);
  const fetchAbort    = useRef<AbortController | null>(null);
  const modalRef      = useRef<HTMLDivElement>(null);

  const shareMedia = videoUrl ?? imageUrl;

  const getShareUrl = () =>
    typeof window !== 'undefined'
      ? `${window.location.origin}/foto/${itemId}`
      : `${SITE_URL}/foto/${itemId}`;

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

  /**
   * Pre-cargar el archivo en cuanto se abre el modal.
   * Cuando el usuario toca Instagram/TikTok, el archivo ya está listo → share inmediato.
   */
  useEffect(() => {
    if (!open || !shareMedia) {
      cachedFile.current = null;
      return;
    }

    cachedFile.current = null;
    const ctrl = new AbortController();
    fetchAbort.current = ctrl;
    setPrefetching(true);

    fetch(shareMedia, { mode: 'cors', credentials: 'omit', signal: ctrl.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        const isVid = !!videoUrl;
        const mime  = isVid ? 'video/mp4' : (blob.type || 'image/jpeg');
        const ext   = isVid ? 'mp4'       : (blob.type.split('/')[1] || 'jpg');
        cachedFile.current = new File([blob], `jym-eventos.${ext}`, { type: mime });
      })
      .catch(() => { /* silencioso: usará URL como fallback */ })
      .finally(() => setPrefetching(false));

    return () => {
      ctrl.abort();
      cachedFile.current = null;
      fetchAbort.current = null;
      setPrefetching(false);
    };
  }, [open, shareMedia, videoUrl]);

  /**
   * Compartir con Instagram / TikTok.
   * Usa el archivo pre-cargado si está disponible; si no, comparte URL.
   */
  async function shareNative(platform: string) {
    const shareUrl = getShareUrl();
    setLoading(platform);

    // ── Con archivo (permite Stories nativas) ──────────────────────
    const file = cachedFile.current;
    if (file && navigator?.share && navigator?.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: title || 'J&M Decoraciones y Eventos' });
        setLoading(null);
        return;
      } catch (e) {
        // AbortError = usuario canceló el share sheet → no hacer nada más
        if (e instanceof Error && e.name === 'AbortError') {
          setLoading(null); return;
        }
        // Otro error con archivo → caer al fallback por URL
      }
    }

    setLoading(null);

    // ── Fallback: compartir URL (sin toast de error) ────────────────
    if (navigator?.share) {
      try {
        await navigator.share({ title: title || 'J&M Decoraciones y Eventos', url: shareUrl });
        return;
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
      }
    }

    // ── Último recurso: copiar al portapapeles ──────────────────────
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast(`¡Enlace copiado! Pégalo en ${platform}`);
    } catch {
      setToast('Copia el enlace desde la barra de arriba');
    }
    setTimeout(() => setToast(null), 2800);
  }

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
      showSpinner: false,
    },
    {
      label: 'WhatsApp',
      bg: '#25d366',
      onClick: () => window.open(
        `https://wa.me/?text=${encodeURIComponent(
          `${title ? title + ' · ' : ''}J&M Decoraciones y Eventos — Sechura, Piura 🎉\n${getShareUrl()}`
        )}`,
        '_blank'
      ),
      icon: (
        <svg viewBox="0 0 24 24" fill="#fff" width={22} height={22}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      ),
      showSpinner: false,
    },
    {
      label: 'Instagram',
      bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
      onClick: () => shareNative('Instagram'),
      showSpinner: true,
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
      onClick: () => shareNative('TikTok'),
      showSpinner: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="#fff" width={20} height={20}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
        </svg>
      ),
    },
  ];

  return (
    <>
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
             strokeLinecap="round" strokeLinejoin="round" width={17} height={17}>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        Compartir
      </button>

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.72rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', margin: 0 }}>
                  Compartir
                </p>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#0a1628', lineHeight: 1.3 }}>
                  {title || 'J&M Decoraciones y Eventos'}
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

            {/* Enlace */}
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

            {/* Toast */}
            {toast && (
              <div style={{
                textAlign: 'center', marginBottom: 10,
                fontSize: '0.75rem', fontWeight: 600, color: '#22c55e',
              }}>
                ✅ {toast}
              </div>
            )}

            {/* Estado de carga por plataforma */}
            {loading && (
              <div style={{
                textAlign: 'center', marginBottom: 10,
                fontSize: '0.75rem', fontWeight: 600, color: '#0a1628',
              }}>
                Abriendo {loading}…
              </div>
            )}

            {/* Indicador de pre-carga del archivo */}
            {prefetching && shareMedia && (
              <div style={{
                textAlign: 'center', marginBottom: 10,
                fontSize: '0.72rem', color: '#888', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Spinner color="#888" size={14} />
                Preparando archivo para compartir…
              </div>
            )}

            {/* Botones de plataformas */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              {platforms.map(p => {
                const isLoading = loading === p.label;
                const isPrefetch = p.showSpinner && prefetching;
                return (
                  <div key={p.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={p.onClick}
                      disabled={!!loading}
                      title={p.label}
                      style={{
                        width: 56, height: 56, borderRadius: '50%', border: 'none',
                        background: p.bg, cursor: loading ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        transition: 'transform .18s, box-shadow .18s',
                        opacity: loading && !isLoading ? 0.5 : 1,
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        if (!loading) {
                          (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px) scale(1.07)';
                          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
                        }
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.transform = '';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }}
                    >
                      {isLoading ? <Spinner /> : isPrefetch ? <PrefetchRing>{p.icon}</PrefetchRing> : p.icon}
                    </button>
                    <span style={{ fontSize: '0.65rem', color: '#666', fontWeight: 600 }}>{p.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shareModalIn {
          from { opacity: 0; transform: scale(0.9) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-ring {
          0%   { opacity: 0.6; transform: scale(0.9); }
          50%  { opacity: 1;   transform: scale(1.05); }
          100% { opacity: 0.6; transform: scale(0.9); }
        }
      `}</style>
    </>
  );
}

function Spinner({ color = '#fff', size = 22 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth={2.5} strokeLinecap="round"
         style={{ animation: 'spin 0.8s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

/** Anillo pulsante alrededor del icono mientras se pre-carga el archivo */
function PrefetchRing({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', inset: -6, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.6)',
        animation: 'pulse-ring 1.2s ease-in-out infinite',
      }} />
      {children}
    </div>
  );
}
