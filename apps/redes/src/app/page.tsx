'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';

const DOC_ID = 'main';

const DEFAULTS = {
  titulo: 'J&M Decoraciones y Eventos',
  subtitulo: 'Creamos momentos inolvidables ✨',
  instagram: 'https://www.instagram.com/jmdecoracionesyeventos1/',
  facebook: 'https://www.facebook.com/JM.DecoracionesyEventosSechura1/',
  tiktok: 'https://www.tiktok.com/@jmdecoraciones.18',
  whatsapp: '51945203708',
};

const IG_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <defs>
      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#feda75" />
        <stop offset="25%" stopColor="#fa7e1e" />
        <stop offset="50%" stopColor="#d62976" />
        <stop offset="75%" stopColor="#962fbf" />
        <stop offset="100%" stopColor="#4f5bd5" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)" />
    <circle cx="12" cy="12" r="4.6" fill="none" stroke="#fff" strokeWidth="1.6" />
    <circle cx="17.2" cy="6.8" r="1.15" fill="#fff" />
  </svg>
);

const TIKTOK_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <rect x="1" y="1" width="22" height="22" rx="6" fill="#010101" />
    <path
      fill="#fff"
      d="M16.6 6.32c-.6-.52-.98-1.28-1.06-2.13h-2.51v11.16a2.14 2.14 0 11-1.51-2.05v-2.6a4.68 4.68 0 00-.63-.04 4.72 4.72 0 104.72 4.72V9.5a6.9 6.9 0 004.06 1.3V8.28a4.28 4.28 0 01-3.07-1.96z"
    />
  </svg>
);

const FB_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <rect x="1" y="1" width="22" height="22" rx="6" fill="#1877F2" />
    <path
      fill="#fff"
      d="M15.6 12.5l.4-2.6h-2.5V8.2c0-.71.35-1.4 1.46-1.4h1.13V4.6s-1.03-.18-2.02-.18c-2.06 0-3.4 1.25-3.4 3.5v1.98H8.4v2.6h2.27v6.3h2.8v-6.3h2.13z"
    />
  </svg>
);

const WA_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <rect x="1" y="1" width="22" height="22" rx="6" fill="#25D366" />
    <path
      fill="#fff"
      d="M12.02 5.5a6.5 6.5 0 00-5.6 9.79L5.5 18.5l3.3-.9a6.5 6.5 0 106.22-12.1zm0 1.5a5 5 0 014.9 5.98 5 5 0 01-9.36 2.94l-.16-.27-1.9.5.52-1.85-.18-.28a5 5 0 014.18-7.02zm-2.24 2.6c-.14 0-.37.05-.56.27-.19.21-.74.72-.74 1.76 0 1.04.76 2.04.86 2.18.1.14 1.47 2.28 3.6 3.1 1.78.7 2.14.56 2.53.53.39-.04 1.25-.51 1.43-1 .18-.49.18-.9.13-1-.05-.09-.19-.14-.4-.25-.21-.1-1.25-.62-1.44-.69-.19-.07-.34-.1-.48.1-.14.21-.55.69-.68.83-.12.14-.25.16-.46.05-.21-.1-.9-.33-1.71-1.05-.63-.56-1.06-1.26-1.18-1.47-.12-.21-.01-.32.09-.42.1-.1.21-.25.32-.38.1-.12.14-.21.21-.35.07-.14.04-.27-.02-.38-.05-.1-.48-1.19-.68-1.62-.17-.39-.35-.36-.48-.36z"
    />
  </svg>
);

const MAIL_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M4 7l8 6 8-6" />
  </svg>
);

const CHEVRON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

const LINKS = [
  { key: 'instagram', label: 'Síguenos en Instagram', icon: IG_ICON, border: '#f2b6cf' },
  { key: 'tiktok', label: 'Síguenos en TikTok', icon: TIKTOK_ICON, border: '#bfe6e6' },
  { key: 'facebook', label: 'Síguenos en Facebook', icon: FB_ICON, border: '#b9d6f7' },
  { key: 'whatsapp', label: 'Escríbenos por WhatsApp', icon: WA_ICON, border: '#bfe8c9' },
];

export default function RedesPage() {
  const [data, setData] = useState<typeof DEFAULTS | null>(null);

  useEffect(() => {
    getDoc(doc(db, COL.REDES_SOCIALES, DOC_ID)).then(snap => {
      setData(snap.exists() ? { ...DEFAULTS, ...snap.data() } : DEFAULTS);
    });
  }, []);

  const d = data || DEFAULTS;

  const hrefFor = (key: string, value: string) => {
    if (!value) return null;
    if (key === 'whatsapp') return `https://wa.me/${value.replace(/\D/g, '')}`;
    return value;
  };

  const domain = (() => {
    try {
      return new URL(d.instagram || 'https://jmdecoracionesyeventos.com').hostname.includes('instagram')
        ? 'jmdecoracionesyeventos.com'
        : 'jmdecoracionesyeventos.com';
    } catch {
      return 'jmdecoracionesyeventos.com';
    }
  })();

  return (
    <main
      style={{
        minHeight: '100dvh',
        background:
          'linear-gradient(160deg,#fbe4ec 0%,#fdf1ee 50%,#fbe9e0 100%)',
        backgroundImage: 'url(/flores-fondo.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.25rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fffdfc',
          borderRadius: 26,
          boxShadow: '0 30px 70px -25px rgba(150,50,90,.35)',
          padding: '2.25rem 1.75rem 2rem',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            margin: '0 auto 1.1rem',
            borderRadius: '50%',
            border: '2px solid #d9ac52',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fffefb',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '1.9rem',
              fontStyle: 'italic',
              fontWeight: 700,
              color: '#c9932a',
            }}
          >
            J&amp;M
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#5a2338',
            margin: '0 0 8px',
          }}
        >
          {d.titulo}
        </h1>
        <p style={{ color: '#b98292', fontSize: '0.88rem', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
          {d.subtitulo}
          <br />
          Decoración · Planificación · Experiencias
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {LINKS.map(l => {
            const href = hrefFor(l.key, (d as any)[l.key]);
            if (!href) return null;
            return (
              <a
                key={l.key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '0.85rem 1.1rem',
                  borderRadius: 16,
                  background: '#fff',
                  border: `1.5px solid ${l.border}`,
                  color: '#3d2530',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  transition: 'transform .15s',
                }}
              >
                <span style={{ flexShrink: 0, display: 'flex' }}>{l.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{l.label}</span>
                <span style={{ color: '#c96a8b', flexShrink: 0, display: 'flex' }}>{CHEVRON}</span>
              </a>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: '1.75rem' }}>
          {[
            { href: hrefFor('instagram', d.instagram), icon: IG_ICON },
            { href: hrefFor('tiktok', d.tiktok), icon: TIKTOK_ICON },
            { href: hrefFor('facebook', d.facebook), icon: FB_ICON },
            { href: hrefFor('whatsapp', d.whatsapp), icon: WA_ICON },
          ]
            .filter(x => x.href)
            .map((x, i) => (
              <a
                key={i}
                href={x.href!}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.55,
                }}
              >
                {x.icon}
              </a>
            ))}
        </div>

        <p style={{ marginTop: '1.25rem', fontSize: '0.72rem', color: '#c9a3ad' }}>
          {domain}
        </p>
      </div>
    </main>
  );
}
