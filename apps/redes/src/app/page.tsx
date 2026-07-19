'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';

const DOC_ID = 'main';

const DEFAULTS = {
  titulo: 'J&M Decoraciones y Eventos',
  subtitulo: 'Síguenos y no te pierdas nuestros eventos ✨',
  instagram: 'https://www.instagram.com/jmdecoracionesyeventos1/',
  facebook: 'https://www.facebook.com/JM.DecoracionesyEventosSechura1/',
  tiktok: 'https://www.tiktok.com/@jmdecoraciones.18',
  whatsapp: '51945203708',
};

const LINKS = [
  {
    key: 'instagram',
    label: 'Instagram',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.163 6.163 0 100 12.326 6.163 6.163 0 000-12.326zm0 10.162a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
        <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0115.54 3h-3.09v12.4a2.592 2.592 0 01-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 004.3 1.38V7.3s-1.88.09-3.24-1.48z" />
      </svg>
    ),
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
        <path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0022 12z" />
      </svg>
    ),
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.83 14.07c-.24.68-1.4 1.32-1.94 1.4-.5.08-1.12.11-1.81-.11-.42-.13-.95-.31-1.64-.6-2.88-1.24-4.76-4.14-4.9-4.33-.14-.19-1.17-1.56-1.17-2.98 0-1.42.74-2.11 1-2.4.26-.29.58-.36.77-.36.19 0 .39 0 .55.01.18.01.42-.07.65.5.24.58.82 2 .89 2.15.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.02 1.12.99 2.06 1.31 2.36 1.45.29.15.46.13.63-.08.17-.2.72-.84.91-1.13.19-.29.38-.24.63-.14.26.1 1.65.78 1.94.92.29.15.48.22.55.34.07.13.07.72-.16 1.4z" />
      </svg>
    ),
  },
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

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(180deg,#fff6f2 0%,#fdeef2 45%,#fff9f4 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fffdfb',
          borderRadius: 28,
          border: '1px solid #f3d9e0',
          boxShadow: '0 20px 60px -20px rgba(180,60,90,.25)',
          padding: '2.5rem 1.75rem 2rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 68,
            height: 68,
            margin: '0 auto 1.1rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#f5c842,#c9932a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-playfair)',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 8px 20px -6px rgba(201,147,42,.6)',
          }}
        >
          J&M
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '1.5rem',
            color: '#7a2740',
            margin: '0 0 6px',
          }}
        >
          {d.titulo}
        </h1>
        <p style={{ color: '#a56b7a', fontSize: '0.92rem', margin: '0 0 2rem' }}>
          {d.subtitulo}
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
                  gap: 14,
                  padding: '0.9rem 1.25rem',
                  borderRadius: 16,
                  background: '#fff',
                  border: '1.5px solid #f3d9e0',
                  color: '#7a2740',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  transition: 'transform .15s, box-shadow .15s',
                  boxShadow: '0 2px 10px -4px rgba(180,60,90,.15)',
                }}
              >
                <span style={{ color: '#c9932a', flexShrink: 0, display: 'flex' }}>{l.icon}</span>
                Sigue a J&M en {l.label}
              </a>
            );
          })}
        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.7rem', color: '#c9a3ad' }}>
          jmdecoracionesyeventos.com
        </p>
      </div>
    </main>
  );
}
