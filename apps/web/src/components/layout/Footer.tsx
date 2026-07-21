'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FooterService { id: string; title: string; link: string }

const toSlug = (link: string) =>
  '/servicios/' + link.replace('servicios/', '').replace('.html', '');

export default function Footer() {
  const [contacto, setContacto] = useState<any>({});
  const [servicios, setServicios] = useState<FooterService[]>([]);
  const [logo, setLogo] = useState('');
  const [footer, setFooter] = useState<any>({});

  useEffect(() => {
    getDoc(doc(db, 'site_config', 'contacto')).then(s => { if (s.exists()) setContacto(s.data()); });
    getDoc(doc(db, 'site_config', 'navbar')).then(s => { if (s.exists()) setLogo(s.data().logo || ''); });
    getDoc(doc(db, 'site_config', 'footer')).then(s => { if (s.exists()) setFooter(s.data()); });
  }, []);

  useEffect(() => onSnapshot(
    query(collection(db, 'services'), where('visible', '==', true), orderBy('order', 'asc')),
    snap => setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() })) as FooterService[])
  ), []);

  const year = new Date().getFullYear();
  const wa = contacto.whatsapp || '51945203708';

  return (
    <footer style={{ background: '#050d1a', color: 'rgba(255,255,255,0.75)', position: 'relative', overflow: 'hidden' }}>
      {/* Línea dorada superior */}
      <div style={{ height: 3, background: 'linear-gradient(90deg,transparent,#d4a017,transparent)' }} />

      {/* Decoración */}
      <div style={{
        position: 'absolute', top: -200, right: -200, width: 500, height: 500, borderRadius: '50%',
        background: 'rgba(212,160,23,0.03)', pointerEvents: 'none'
      }} />

      <div className="container" style={{ padding: '4rem 1.5rem 2rem' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '2.5rem',
          marginBottom: '3rem'
        }} className="footer-grid">

          {/* Columna 1 — Marca */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12, overflow: 'hidden',
                background: logo ? 'transparent' : 'linear-gradient(135deg,#b8860b,#f5c842)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', flexShrink: 0
              }}>
                {logo
                  ? <Image src={logo} alt={footer.legalName || 'J&M Decoraciones y Eventos'} width={52} height={52} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : '🎉'}
              </div>
              <div>
                <p style={{ color: '#fff', fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: '1.1rem', margin: 0, lineHeight: 1.2 }}>
                  {footer.legalName || 'J&M Decoraciones y Eventos'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                  {footer.tagline || 'Sechura'}
                </p>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>
              {footer.desc || 'En cada evento, cuidamos cada detalle para que tú solo te encargues de disfrutar. Ofrecemos una gama completa de servicios para hacer de tu celebración una experiencia única.'}
            </p>
            <p style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', color: 'rgba(255,255,255,0.3)', fontSize: '0.88rem' }}>
              {footer.quote || 'J&M Decoraciones y Eventos'}
            </p>
          </div>

          {/* Columna 2 — Servicios */}
          <div>
            <h4 style={{
              color: '#fff', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.12em', marginBottom: 20, paddingBottom: 12,
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              Nuestros Servicios
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {servicios.map(s => (
                <li key={s.id}>
                  <a href={toSlug(s.link)}
                    style={{
                      color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontSize: '0.88rem',
                      transition: 'color .2s', display: 'flex', alignItems: 'center', gap: 6
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f5c842'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'}>
                    <span style={{ color: '#d4a017', fontSize: '0.75rem' }}>▶</span> {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3 — Otros links */}
          <div>
            <h4 style={{
              color: '#fff', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.12em', marginBottom: 20, paddingBottom: 12,
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              Otros Links
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Sobre Nosotros', href: '/sobre-nosotros' },
                { label: 'Galería de Eventos', href: '/galeria' },
                { label: 'Contacto', href: '/contacto' },
                { label: 'Política de Privacidad', href: '/privacidad' },
                { label: 'Términos del Servicio', href: '/terminos' },
                { label: 'Política de Cookies', href: '/cookies' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href}
                    style={{
                      color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontSize: '0.88rem',
                      transition: 'color .2s', display: 'flex', alignItems: 'center', gap: 6
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f5c842'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'}>
                    <span style={{ color: '#d4a017', fontSize: '0.75rem' }}>▶</span> {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 4 — Contacto */}
          <div>
            <h4 style={{
              color: '#fff', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.12em', marginBottom: 20, paddingBottom: 12,
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              Información de Contacto
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: '📞', label: contacto.telefono || '(+51) 945 203 708', sub: 'WhatsApp disponible', href: `https://wa.me/${wa}` },
                { icon: '✉️', label: contacto.email || 'jmdecoracionesyeventossechura@gmail.com', href: `mailto:${contacto.email || 'jmdecoracionesyeventossechura@gmail.com'}` },
                { icon: '📍', label: contacto.direccion || 'Sechura, Piura - Sechura' },
              ].map(({ icon, label, sub, href }) => (
                <div key={label} style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <div>
                    {href
                      ? <a href={href} className="footer-contact-value" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', textDecoration: 'none', transition: 'color .2s', wordBreak: 'break-word' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f5c842'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'}>{label}</a>
                      : <p className="footer-contact-value" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', margin: 0, wordBreak: 'break-word' }}>{label}</p>
                    }
                    {sub && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', margin: '2px 0 0' }}>{sub}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Redes sociales */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              {([
                {
                  bg: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',
                  shadow: 'rgba(253,29,29,0.5)',
                  href: contacto.instagram || 'https://www.instagram.com/jmdecoracionesyeventos1/',
                  label: 'Instagram',
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>,
                },
                {
                  bg: '#1877f2', shadow: 'rgba(24,119,242,0.5)',
                  href: contacto.facebook || 'https://www.facebook.com/JM.DecoracionesyEventosSechura1/',
                  label: 'Facebook',
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
                },
                {
                  bg: '#010101', shadow: 'rgba(0,0,0,0.6)',
                  href: contacto.tiktok || 'https://www.tiktok.com/@jmdecoraciones.18',
                  label: 'TikTok',
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.75a4.85 4.85 0 01-1-.06z" /></svg>,
                },
                {
                  bg: '#25d366', shadow: 'rgba(37,211,102,0.5)',
                  href: `https://wa.me/${wa}`,
                  label: 'WhatsApp',
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>,
                },
              ] as const).map(({ bg, shadow, href, label, svg }, idx) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  aria-label={label}
                  style={{
                    width: 40, height: 40, borderRadius: 10, background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', textDecoration: 'none', flexShrink: 0,
                    boxShadow: `0 4px 12px ${shadow}`,
                    animation: `footerFloat ${2.8 + idx * 0.4}s ease-in-out infinite`,
                    animationDelay: `${idx * 0.3}s`,
                    transition: 'transform .25s cubic-bezier(0.23,1,0.32,1), box-shadow .25s ease'
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.animationPlayState = 'paused'; el.style.transform = 'translateY(-7px) scale(1.15)'; el.style.boxShadow = `0 14px 32px ${shadow}`; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.animationPlayState = 'running'; el.style.transform = ''; el.style.boxShadow = `0 4px 12px ${shadow}`; }}>
                  {svg}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Línea separadora */}
        <div className="footer-bottom" style={{
          borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12
        }}>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            © {footer.foundedYear || '2018'} – {year} {footer.legalName || 'J&M Decoraciones y Eventos'} | Todos los derechos reservados.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: 'Privacidad', href: '/privacidad' },
              { label: 'Términos', href: '/terminos' },
              { label: 'Cookies', href: '/cookies' },
            ].map(({ label, href }) => (
              <a key={label} href={href}
                style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f5c842'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:1023px){ .footer-grid{ grid-template-columns:1fr 1fr !important; gap:2rem !important; } }
        @media(max-width:640px) {
          .footer-grid{ grid-template-columns:1fr !important; }
          .footer-bottom{ flex-direction:column; align-items:center; text-align:center; }
          .footer-bottom > div { justify-content: center; }
        }
        @media(max-width:480px) {
          .footer-contact-value{ font-size:0.75rem !important; word-break:break-all; }
        }
        @keyframes footerFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>
    </footer>
  );
}