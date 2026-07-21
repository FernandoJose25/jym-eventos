'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LegalSection { title: string; content: string }

interface Props {
  legalKey: 'privacidad' | 'terminos' | 'cookies';
  defaultSections: LegalSection[];
  heroTitle: string;
  heroHighlight: string;
  heroBadge?: string;
  heroDesc?: string;
  introText?: string;
  ctaTitle?: string;
  ctaDesc?: string;
}

export default function LegalPageClient({
  legalKey, defaultSections, heroTitle, heroHighlight,
  heroBadge = '✦ Legal',
  heroDesc = 'Última actualización: enero de 2025',
  introText,
  ctaTitle = '¿Tienes alguna pregunta?',
  ctaDesc = 'Estamos aquí para ayudarte con cualquier duda.',
}: Props) {
  const [sections, setSections] = useState<LegalSection[]>(defaultSections);

  useEffect(() => {
    getDoc(doc(db, 'site_config', 'legal')).then(snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      const arr = data[legalKey];
      if (Array.isArray(arr) && arr.length > 0) setSections(arr);
    }).catch(() => {});
  }, [legalKey]);

  return (
    <>
      {/* Hero */}
      <section style={{
        minHeight: '40vh', display: 'flex', alignItems: 'center',
        background: 'radial-gradient(ellipse 100% 80% at 50% 30%, #0f2044 0%, #050d1a 55%, #000 100%)',
        position: 'relative', overflow: 'hidden', paddingTop: 80,
      }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)', backgroundSize:'80px 80px', pointerEvents:'none' }}/>
        <div className="container" style={{ position:'relative', zIndex:2, textAlign:'center', padding:'4rem 1.5rem' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0.4rem 1.25rem', borderRadius:9999, background:'rgba(212,160,23,0.1)', border:'1px solid rgba(212,160,23,0.3)', color:'#d4a017', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.22em', marginBottom:'1.25rem' }}>
            {heroBadge}
          </span>
          <h1 style={{ fontFamily:'var(--font-playfair)', fontSize:'clamp(2.5rem,5vw,4rem)', color:'#fff', lineHeight:1.1, fontWeight:700, margin:'0 0 1rem' }}>
            {heroTitle}{' '}
            <span style={{ background:'linear-gradient(135deg,#b8860b 0%,#f5c842 40%,#b8860b 80%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', fontStyle:'italic' }}>
              {heroHighlight}
            </span>
          </h1>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'1rem', margin:0 }}>
            {heroDesc}
          </p>
        </div>
      </section>

      {/* Contenido */}
      <section style={{ background:'#fff', padding:'5rem 0 7rem' }}>
        <div className="container" style={{ maxWidth:800, margin:'0 auto', padding:'0 1.5rem' }}>
          {introText && (
            <p style={{ color:'#475569', fontSize:'1.05rem', lineHeight:1.85, marginBottom:'3rem', padding:'1.5rem 2rem', background:'#f8fafc', borderLeft:'4px solid #d4a017', borderRadius:'0 12px 12px 0' }}>
              {introText}
            </p>
          )}

          {sections.map((sec, i) => (
            <div key={i} style={{ marginBottom:'2.5rem' }}>
              <h2 style={{ fontFamily:'var(--font-playfair)', fontSize:'1.35rem', color:'#0a1628', fontWeight:700, marginBottom:'0.875rem', paddingBottom:'0.5rem', borderBottom:'1px solid #e2e8f0' }}>
                {sec.title}
              </h2>
              <p style={{ color:'#475569', fontSize:'0.95rem', lineHeight:1.85, whiteSpace:'pre-line', margin:0 }}>
                {sec.content}
              </p>
            </div>
          ))}

          <div style={{ marginTop:'4rem', padding:'2rem', background:'linear-gradient(135deg,rgba(212,160,23,0.08),rgba(212,160,23,0.03))', border:'1px solid rgba(212,160,23,0.2)', borderRadius:16, textAlign:'center' }}>
            <p style={{ color:'#0a1628', fontWeight:700, fontFamily:'var(--font-playfair)', fontSize:'1.1rem', margin:'0 0 0.5rem' }}>{ctaTitle}</p>
            <p style={{ color:'#64748b', fontSize:'0.88rem', margin:'0 0 1.25rem' }}>{ctaDesc}</p>
            <a href="/contacto" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0.75rem 2rem', borderRadius:9999, background:'linear-gradient(135deg,#b8860b,#f5c842)', color:'#0a1628', fontWeight:700, fontSize:'0.9rem', textDecoration:'none' }}>
              Contáctanos →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
