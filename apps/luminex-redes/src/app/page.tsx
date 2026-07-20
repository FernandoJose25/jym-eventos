'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';

const DOC_ID = 'main';

const DEFAULTS = {
  titulo: 'Luminex Studio & Events',
  subtitulo: 'Fotografía instantánea y photobooks para tu evento ✨',
  instagram: 'https://www.instagram.com/luminexstudioevents',
  facebook: 'https://www.facebook.com/profile.php?id=61582260265344',
  tiktok: 'https://www.tiktok.com/@luminex_studio_ev',
  whatsapp: '51919728986',
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

const CHEVRON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

const VERIFIED_BADGE = (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
    <path d="M12 1.5l2.4 1.6 2.85-.4 1.1 2.65 2.65 1.1-.4 2.85 1.6 2.4-1.6 2.4.4 2.85-2.65 1.1-1.1 2.65-2.85-.4L12 22.5l-2.4-1.6-2.85.4-1.1-2.65-2.65-1.1.4-2.85L1.8 12l1.6-2.4-.4-2.85 2.65-1.1 1.1-2.65 2.85.4L12 1.5z" />
    <path d="M8.6 12.3l2.2 2.2 4.6-4.6" fill="none" stroke="#0a0a0c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LINKS = [
  {
    key: 'instagram',
    label: 'Síguenos en Instagram',
    icon: IG_ICON,
    border: 'rgba(214, 41, 118, 0.3)',
    glow: 'rgba(214, 41, 118, 0.4)',
    accent: '#d62976',
  },
  {
    key: 'tiktok',
    label: 'Síguenos en TikTok',
    icon: TIKTOK_ICON,
    border: 'rgba(212, 175, 55, 0.35)',
    glow: 'rgba(212, 175, 55, 0.4)',
    accent: '#d4af37',
  },
  {
    key: 'facebook',
    label: 'Síguenos en Facebook',
    icon: FB_ICON,
    border: 'rgba(24, 119, 242, 0.3)',
    glow: 'rgba(24, 119, 242, 0.4)',
    accent: '#1877F2',
  },
  {
    key: 'whatsapp',
    label: 'Escríbenos por WhatsApp',
    icon: WA_ICON,
    border: 'rgba(37, 211, 102, 0.3)',
    glow: 'rgba(37, 211, 102, 0.4)',
    accent: '#25D366',
  },
];

const PARTICLES = [
  { top: '12%', left: '8%', size: 6, delay: '0s' },
  { top: '22%', left: '88%', size: 4, delay: '2s' },
  { top: '68%', left: '6%', size: 5, delay: '4s' },
  { top: '80%', left: '92%', size: 7, delay: '1.4s' },
  { top: '45%', left: '95%', size: 3, delay: '3.2s' },
  { top: '55%', left: '3%', size: 4, delay: '5.6s' },
];

export default function RedesPage() {
  const [data, setData] = useState<typeof DEFAULTS | null>(null);

  useEffect(() => {
    getDoc(doc(db, COL.REDES_SOCIALES, DOC_ID)).then(snap => {
      setData(snap.exists() ? { ...DEFAULTS, ...snap.data() } : DEFAULTS);
    }).catch(() => setData(DEFAULTS));
  }, []);

  const d = data || DEFAULTS;

  const hrefFor = (key: string, value: string) => {
    if (!value) return null;
    if (key === 'whatsapp') return `https://wa.me/${value.replace(/\D/g, '')}`;
    return value;
  };

  return (
    <main className="page-bg">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          aria-hidden="true"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
          }}
        />
      ))}

      <div className="card-wrap">
        <div className="card-glow" aria-hidden="true" />

        <div className="card">
          <div className="logo-ring">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-luminex.jpg" alt="Luminex Studio & Events" className="logo-img" />
          </div>

          <div className="title-row">
            <h1 className="title">{d.titulo}</h1>
            <span className="verified-badge" title="Cuenta verificada">
              {VERIFIED_BADGE}
            </span>
          </div>

          <p className="subtitle">
            {d.subtitulo}
            <br />
            Fotografía Instantánea · Photobook · Fotografía Profesional
          </p>

          <div className="link-list">
            {LINKS.map((l, i) => {
              const href = hrefFor(l.key, (d as any)[l.key]);
              if (!href) return null;
              return (
                <a
                  key={l.key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-btn"
                  style={
                    {
                      '--btn-border': l.border,
                      '--btn-border-hover': l.accent,
                      '--btn-accent': l.accent,
                      '--btn-glow': l.glow,
                      '--stagger': `${0.4 + i * 0.1}s`,
                      '--shimmer-delay': `${i * 1.1 + 2}s`,
                    } as React.CSSProperties
                  }
                >
                  <span className="link-icon">{l.icon}</span>
                  <span className="link-label">{l.label}</span>
                  <span className="link-arrow">{CHEVRON}</span>
                </a>
              );
            })}
          </div>

          <div className="footer-icons">
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
                  className="footer-icon"
                >
                  {x.icon}
                </a>
              ))}
          </div>

          <a
            href="https://luminex-redes.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-domain"
          >
            luminex-redes.vercel.app
          </a>
        </div>
      </div>
    </main>
  );
}
