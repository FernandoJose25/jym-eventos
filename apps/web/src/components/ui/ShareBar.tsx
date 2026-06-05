'use client';
import { useState } from 'react';

interface ShareBarProps {
  itemId: string;
  title?: string;
  basePath?: string; // si el componente está embebido en otra página (ej. "/galeria")
}

export function ShareBar({ itemId, title, basePath }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const [loadingShare, setLoadingShare] = useState(false);

  const getDeepUrl = () => {
    if (typeof window === 'undefined') return '';
    const path = basePath ?? window.location.pathname;
    return `${window.location.origin}${path}?foto=${itemId}`;
  };

  const getMsg = () =>
    `${title ? title + ' · ' : ''}J&M Eventos y Decoraciones — Sechura, Piura 🎉\n${getDeepUrl()}`;

  const copyLink = () => {
    navigator.clipboard.writeText(getDeepUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  // Abre la hoja nativa del sistema (incluye Instagram y TikTok en móvil)
  const nativeShare = async () => {
    const url = getDeepUrl();
    setLoadingShare(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: title || 'J&M Eventos', text: getMsg(), url });
      } else {
        copyLink();
      }
    } catch { /* usuario canceló */ }
    finally { setLoadingShare(false); }
  };

  const platforms = [
    {
      label: 'Facebook',
      color: '#1877f2',
      onClick: () => window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getDeepUrl())}`,
        '_blank'
      ),
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width={19} height={19}>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
        </svg>
      ),
    },
    {
      label: 'WhatsApp',
      color: '#25d366',
      onClick: () => window.open(
        `https://wa.me/?text=${encodeURIComponent(getMsg())}`,
        '_blank'
      ),
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width={19} height={19}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      ),
    },
    {
      label: 'Instagram',
      color: '#e1306c',
      onClick: nativeShare,
      loading: loadingShare,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
             strokeLinecap="round" strokeLinejoin="round" width={19} height={19}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      ),
    },
    {
      label: 'TikTok',
      color: '#fff',
      onClick: nativeShare,
      loading: loadingShare,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
        </svg>
      ),
    },
  ];

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, marginTop: 14, flexWrap: 'wrap',
      }}
    >
      {platforms.map(p => (
        <button
          key={p.label}
          onClick={p.onClick}
          title={`Compartir en ${p.label}`}
          disabled={p.loading}
          style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: `${p.color}1a`,
            border: `1.5px solid ${p.color}44`,
            color: p.color, cursor: p.loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .18s', opacity: p.loading ? 0.6 : 1,
          }}
          onMouseEnter={e => {
            if (!p.loading) {
              (e.currentTarget as HTMLElement).style.background = `${p.color}38`;
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px) scale(1.08)';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = `${p.color}1a`;
            (e.currentTarget as HTMLElement).style.transform = '';
          }}
        >
          {p.icon}
        </button>
      ))}

      <button
        onClick={copyLink}
        title="Copiar enlace"
        style={{
          height: 40, padding: '0 14px', borderRadius: 999, flexShrink: 0,
          background: copied ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.09)',
          border: `1.5px solid ${copied ? '#22c55e' : 'rgba(255,255,255,0.22)'}`,
          color: copied ? '#22c55e' : 'rgba(255,255,255,0.85)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          fontSize: '0.76rem', fontWeight: 600, transition: 'all .18s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          if (!copied) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.16)';
        }}
        onMouseLeave={e => {
          if (!copied) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)';
        }}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
               strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
               strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        )}
        {copied ? '¡Copiado!' : 'Copiar enlace'}
      </button>
    </div>
  );
}
