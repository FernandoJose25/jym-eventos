'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronDown } from 'lucide-react';

interface NavService { id: string; title: string; icon: string; order: number; link: string }
interface NavConfig { nombre?: string; tagline?: string; logo?: string }

const toSlugUrl = (link: string) => {
  if (!link) return '/contacto';
  return '/servicios/' + link.replace('servicios/', '').replace('.html', '');
};

export default function Navbar() {
  const pathname = usePathname();
  const [services,   setServices]   = useState<NavService[]>([]);
  const [navConfig,  setNavConfig]  = useState<NavConfig>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servOpen,   setServOpen]   = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const dropRef    = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => onSnapshot(
    query(collection(db, 'services'), where('visible', '==', true), orderBy('order', 'asc')),
    snap => setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })) as NavService[])
  ), []);

  useEffect(() => {
    getDoc(doc(db, 'site_config', 'navbar')).then(snap => {
      if (snap.exists()) setNavConfig(snap.data() as NavConfig);
    });
  }, []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => { setMobileOpen(false); setServOpen(false); }, [pathname]);

  const openDrop  = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setServOpen(true); };
  const closeDrop = () => { closeTimer.current = setTimeout(() => setServOpen(false), 120); };

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  const servActive = pathname.startsWith('/servicios');
  // On service detail pages, always show dark navbar (hero is light-themed)
  const alwaysDark = pathname.startsWith('/servicios/');
  const effectiveScrolled = scrolled || alwaysDark;

  const NAV = [
    { href: '/',               label: 'Inicio' },
    { href: '/sobre-nosotros', label: 'Nosotros' },
    { href: '/galeria',        label: 'Galería' },
    { href: '/contacto',       label: 'Contacto' },
  ];

  const anunciaHref = '/anuncia-con-nosotros';
  const anunciaActive = pathname === anunciaHref;

  return (
    <>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        transition: 'background 0.35s, border-color 0.35s, box-shadow 0.35s',
        background: effectiveScrolled ? 'rgba(8,17,32,0.96)' : 'transparent',
        backdropFilter: effectiveScrolled ? 'blur(24px) saturate(160%)' : 'none',
        WebkitBackdropFilter: effectiveScrolled ? 'blur(24px) saturate(160%)' : 'none',
        borderBottom: effectiveScrolled ? '1px solid rgba(212,160,23,0.18)' : '1px solid transparent',
        boxShadow: effectiveScrolled ? '0 2px 32px rgba(0,0,0,0.35)' : 'none',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', height: 72, gap: 8 }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0, marginRight: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, flexShrink: 0,
              background: navConfig.logo ? 'transparent' : 'linear-gradient(135deg,#b8860b,#f5c842)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem', boxShadow: navConfig.logo ? 'none' : '0 4px 14px rgba(212,160,23,0.45)',
              overflow: 'hidden',
            }}>
              {navConfig.logo
                ? <img src={navConfig.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
                : '🎉'}
            </div>
            <div>
              <p style={{ color: '#fff', fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2, margin: 0 }}>{navConfig.nombre || 'J&M Eventos'}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', margin: 0, letterSpacing: '.06em' }}>{navConfig.tagline || 'Decoraciones & Eventos'}</p>
            </div>
          </Link>

          {/* Desktop nav — CSS controls visibility */}
          <nav className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
              {NAV.map(({ href, label }) => (
                <Link key={href} href={href} style={{
                  position: 'relative', padding: '0.5rem 0.9rem', borderRadius: 8,
                  fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none',
                  color: isActive(href) ? '#f5c842' : 'rgba(255,255,255,0.75)',
                  transition: 'color 0.15s',
                }}
                  onMouseEnter={e => { if (!isActive(href)) (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                  onMouseLeave={e => { if (!isActive(href)) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'; }}
                >
                  {label}
                  {isActive(href) && (
                    <span style={{
                      position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                      width: 18, height: 2, borderRadius: 2,
                      background: 'linear-gradient(90deg,#b8860b,#f5c842)',
                    }} />
                  )}
                </Link>
              ))}

              {/* Anuncia con Nosotros */}
              <Link href={anunciaHref} style={{
                position: 'relative', padding: '0.5rem 0.9rem', borderRadius: 8,
                fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
                color: anunciaActive ? '#f5c842' : 'rgba(245,200,66,0.65)',
                transition: 'color 0.15s',
                letterSpacing: '.01em',
              }}
                onMouseEnter={(e: { currentTarget: HTMLElement }) => { if (!anunciaActive) e.currentTarget.style.color = '#f5c842'; }}
                onMouseLeave={(e: { currentTarget: HTMLElement }) => { if (!anunciaActive) e.currentTarget.style.color = 'rgba(245,200,66,0.65)'; }}
              >
                Anuncia con nosotros
                {anunciaActive && (
                  <span style={{
                    position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                    width: 18, height: 2, borderRadius: 2,
                    background: 'linear-gradient(90deg,#b8860b,#f5c842)',
                  }} />
                )}
              </Link>

              {/* Servicios dropdown — hover */}
              <div ref={dropRef} style={{ position: 'relative' }}
                onMouseEnter={openDrop} onMouseLeave={closeDrop}>
                <button style={{
                  position: 'relative', display: 'flex', alignItems: 'center', gap: 4,
                  padding: '0.5rem 0.9rem', borderRadius: 8,
                  fontSize: '0.875rem', fontWeight: 500, background: 'none', border: 'none',
                  cursor: 'pointer', color: servActive ? '#f5c842' : 'rgba(255,255,255,0.75)',
                  transition: 'color 0.15s',
                }}
                  onMouseEnter={e => { if (!servActive) (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                  onMouseLeave={e => { if (!servActive) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)'; }}
                >
                  Servicios
                  <ChevronDown size={13} style={{ transition: 'transform .22s', transform: servOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                  {servActive && (
                    <span style={{
                      position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                      width: 18, height: 2, borderRadius: 2,
                      background: 'linear-gradient(90deg,#b8860b,#f5c842)',
                    }} />
                  )}
                </button>

                {/* Mega dropdown */}
                <div style={{
                  position: 'absolute', top: 'calc(100% + 10px)', left: '50%',
                  background: 'rgba(8,17,32,0.97)', backdropFilter: 'blur(24px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                  border: '1px solid rgba(212,160,23,0.2)', borderRadius: 18,
                  padding: '0.625rem', minWidth: 260,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
                  pointerEvents: servOpen ? 'auto' : 'none',
                  opacity: servOpen ? 1 : 0,
                  transform: servOpen
                    ? 'translateX(-50%) translateY(0)'
                    : 'translateX(-50%) translateY(-6px)',
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                }}>
                  {/* Arrow */}
                  <div style={{
                    position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                    width: 12, height: 6, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: 12, height: 12, background: 'rgba(8,17,32,0.97)',
                      border: '1px solid rgba(212,160,23,0.2)', transform: 'rotate(45deg)',
                      marginTop: 3,
                    }} />
                  </div>

                  {services.length === 0 && (
                    <div style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' }}>
                      Cargando…
                    </div>
                  )}
                  {services.map(s => {
                    const href = toSlugUrl(s.link);
                    const active = pathname === href;
                    return (
                      <Link key={s.id} href={href} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '0.625rem 0.875rem', borderRadius: 12,
                        textDecoration: 'none', transition: 'background 0.13s',
                        background: active ? 'rgba(212,160,23,0.12)' : 'transparent',
                      }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div style={{
                          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                          background: active ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.07)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1rem', transition: 'background 0.13s',
                        }}>
                          {s.icon}
                        </div>
                        <span style={{
                          fontSize: '0.85rem', fontWeight: active ? 600 : 500,
                          color: active ? '#f5c842' : 'rgba(255,255,255,0.82)',
                        }}>
                          {s.title}
                        </span>
                        {active && (
                          <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#f5c842', flexShrink: 0 }} />
                        )}
                      </Link>
                    );
                  })}

                  <div style={{ margin: '0.5rem 0.875rem 0.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                    <a href="https://wa.me/51945203708?text=Hola%2C%20quiero%20cotizar%20un%20evento"
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0.55rem', borderRadius: 10,
                        background: 'linear-gradient(135deg,rgba(184,134,11,0.25),rgba(245,200,66,0.15))',
                        border: '1px solid rgba(212,160,23,0.25)',
                        color: '#f5c842', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg,rgba(184,134,11,0.4),rgba(245,200,66,0.25))'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg,rgba(184,134,11,0.25),rgba(245,200,66,0.15))'}
                    >
                      Cotizar un evento →
                    </a>
                  </div>
                </div>
              </div>
            </nav>

          {/* CTA — desktop only via CSS */}
          <a href="https://wa.me/51945203708?text=Hola%2C%20quiero%20cotizar%20un%20evento"
             target="_blank" rel="noopener noreferrer"
             className="nav-cta-desktop"
             style={{
               display: 'flex', alignItems: 'center', gap: 6,
               padding: '0.55rem 1.25rem', flexShrink: 0,
               background: 'linear-gradient(135deg,#b8860b,#f5c842)',
               borderRadius: 9999, color: '#0a1628',
               fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none',
               boxShadow: '0 4px 14px rgba(212,160,23,0.4)',
               transition: 'box-shadow 0.15s, transform 0.15s',
             }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 22px rgba(212,160,23,0.6)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(212,160,23,0.4)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            💬 Cotizar
          </a>

          {/* Hamburger — mobile only via CSS */}
          <button onClick={() => setMobileOpen(v => !v)} className="nav-hamburger" style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, width: 44, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', marginLeft: 'auto',
            fontSize: '1.1rem', transition: 'background 0.15s', flexShrink: 0,
          }}>
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile menu — always rendered, CSS + state controls visibility */}
      <div className="nav-mobile-overlay" style={{
        position: 'fixed', inset: 0, zIndex: 99,
        pointerEvents: mobileOpen ? 'auto' : 'none',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(8,17,32,0.96)', backdropFilter: 'blur(20px)',
          opacity: mobileOpen ? 1 : 0, transition: 'opacity 0.25s',
        }} onClick={() => setMobileOpen(false)} />
        <nav style={{
          position: 'relative', zIndex: 100, marginTop: 72,
          maxHeight: 'calc(100vh - 72px)', overflowY: 'auto',
          padding: '1.25rem 1rem 2.5rem',
          transform: mobileOpen ? 'translateY(0)' : 'translateY(-12px)',
          opacity: mobileOpen ? 1 : 0, transition: 'transform 0.25s ease, opacity 0.25s ease',
        }}>
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href} style={{
                display: 'block', padding: '0.875rem 1rem',
                fontSize: '1.05rem', fontWeight: 600,
                color: isActive(href) ? '#f5c842' : 'rgba(255,255,255,0.85)',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                {label}
              </Link>
            ))}

            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '.12em', padding: '1rem 1rem 0.5rem', margin: 0 }}>
              Servicios
            </p>
            {services.map(s => {
              const href = toSlugUrl(s.link);
              return (
                <Link key={s.id} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '0.75rem 1rem', fontSize: '0.95rem',
                  color: pathname === href ? '#f5c842' : 'rgba(255,255,255,0.8)',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem',
                  }}>{s.icon}</span>
                  <span>{s.title}</span>
                </Link>
              );
            })}

            <Link href={anunciaHref} style={{
              display: 'block', padding: '0.875rem 1rem',
              fontSize: '1.05rem', fontWeight: 700,
              color: anunciaActive ? '#f5c842' : 'rgba(245,200,66,0.8)',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              borderTop: '1px solid rgba(212,160,23,0.12)',
              marginTop: '0.5rem',
            }}>
              📣 Anuncia con nosotros
            </Link>

            <a href="https://wa.me/51945203708" target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              margin: '1.5rem 0 0', padding: '0.875rem',
              borderRadius: 14, background: 'linear-gradient(135deg,#b8860b,#f5c842)',
              color: '#0a1628', fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
            }}>
              💬 Cotizar por WhatsApp
            </a>
        </nav>
      </div>

      <style>{`
        /* Show desktop nav, hide hamburger by default */
        .nav-desktop       { display: flex !important; }
        .nav-cta-desktop   { display: flex !important; }
        .nav-hamburger     { display: none !important; }
        .nav-mobile-overlay{ display: none !important; }

        @media (max-width: 900px) {
          .nav-desktop       { display: none !important; }
          .nav-cta-desktop   { display: none !important; }
          .nav-hamburger     { display: flex !important; }
          .nav-mobile-overlay{ display: block !important; }
        }
      `}</style>
    </>
  );
}
