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
  const [services, setServices] = useState<NavService[]>([]);
  const [navConfig, setNavConfig] = useState<NavConfig>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servOpen, setServOpen] = useState(false);
  const [nosotrosOpen, setNosotrosOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const nosotrosRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nosotrosTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => onSnapshot(
    query(collection(db, 'services'), where('visible', '==', true), orderBy('order', 'asc')),
    snap => setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })) as NavService[])
  ), []);

  useEffect(() => {
    // Muestra el último logo conocido al instante (evita el flash del ícono por defecto)
    try {
      const cached = localStorage.getItem('navConfigCache');
      if (cached) setNavConfig(JSON.parse(cached));
    } catch { }

    getDoc(doc(db, 'site_config', 'navbar')).then(snap => {
      if (snap.exists()) {
        const data = snap.data() as NavConfig;
        setNavConfig(data);
        try { localStorage.setItem('navConfigCache', JSON.stringify(data)); } catch { }
      }
    }).catch(err => console.error('Error cargando config del navbar:', err));
  }, []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => { setMobileOpen(false); setServOpen(false); }, [pathname]);

  const openDrop = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setServOpen(true); };
  const closeDrop = () => { closeTimer.current = setTimeout(() => setServOpen(false), 120); };
  const openNosotros = () => { if (nosotrosTimer.current) clearTimeout(nosotrosTimer.current); setNosotrosOpen(true); };
  const closeNosotros = () => { nosotrosTimer.current = setTimeout(() => setNosotrosOpen(false), 120); };

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  const servActive = pathname.startsWith('/servicios');
  // On service detail pages, always show dark navbar (hero is light-themed)
  const alwaysDark = pathname.startsWith('/servicios/');
  const effectiveScrolled = scrolled || alwaysDark;

  const NAV = [
    { href: '/', label: 'Inicio' },
    { href: '/sobre-nosotros', label: 'Nosotros' },
    { href: '/galeria', label: 'Galería' },
    { href: '/contacto', label: 'Contacto' },
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
                ? <img src={navConfig.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : '🎉'}
            </div>
            <div>
              <p style={{ color: '#fff', fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2, margin: 0 }}>{navConfig.nombre || 'J&M Decoraciones y Eventos'}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', margin: 0, letterSpacing: '.06em' }}>{navConfig.tagline || 'Decoraciones & Eventos'}</p>
            </div>
          </Link>

          {/* Desktop nav — CSS controls visibility */}
          <nav className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
            {NAV.map(({ href, label }) => {
              if (href === '/sobre-nosotros') {
                const active = isActive(href);
                return (
                  <div key={href} ref={nosotrosRef} style={{ position: 'relative' }}
                    onMouseEnter={openNosotros} onMouseLeave={closeNosotros}>
                    <Link href={href} style={{
                      position: 'relative', display: 'flex', alignItems: 'center', gap: 4,
                      padding: '0.5rem 0.9rem', borderRadius: 8,
                      fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none',
                      color: active ? '#f5c842' : 'rgba(255,255,255,0.75)',
                      transition: 'color 0.15s',
                    }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'; }}
                    >
                      {label}
                      {active && (
                        <span style={{
                          position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                          width: 18, height: 2, borderRadius: 2,
                          background: 'linear-gradient(90deg,#b8860b,#f5c842)',
                        }} />
                      )}
                    </Link>

                    {/* Nosotros mini-dropdown */}
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 10px)', left: '50%',
                      transform: nosotrosOpen ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-6px)',
                      background: 'rgba(8,17,32,0.97)', backdropFilter: 'blur(24px) saturate(160%)',
                      WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                      border: '1px solid rgba(212,160,23,0.2)', borderRadius: 18,
                      padding: '1.25rem',
                      minWidth: 260,
                      boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
                      pointerEvents: nosotrosOpen ? 'auto' : 'none',
                      opacity: nosotrosOpen ? 1 : 0,
                      transition: 'opacity 0.2s ease, transform 0.2s ease',
                      zIndex: 200,
                    }}>
                      {/* Arrow */}
                      <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 12, height: 6, overflow: 'hidden' }}>
                        <div style={{ width: 12, height: 12, background: 'rgba(8,17,32,0.97)', border: '1px solid rgba(212,160,23,0.2)', transform: 'rotate(45deg)', marginTop: 3 }} />
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                        {[{ val: '+500', lbl: 'Eventos' }, { val: '+10', lbl: 'Años' }, { val: '100%', lbl: 'Satisfacción' }].map(s => (
                          <div key={s.lbl} style={{
                            flex: 1, textAlign: 'center', padding: '0.6rem 0.4rem',
                            background: 'rgba(212,160,23,0.08)', borderRadius: 10,
                            border: '1px solid rgba(212,160,23,0.15)',
                          }}>
                            <p style={{ color: '#f5c842', fontFamily: 'var(--font-playfair)', fontSize: '1rem', fontWeight: 700, margin: '0 0 2px', lineHeight: 1 }}>{s.val}</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '.1em', margin: 0 }}>{s.lbl}</p>
                          </div>
                        ))}
                      </div>

                      {/* Description */}
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', lineHeight: 1.65, margin: '0 0 1rem', fontFamily: 'var(--font-jakarta)' }}>
                        Creamos experiencias únicas e inolvidables en Sechura, Piura. Más de una década transformando sueños en realidad.
                      </p>

                      {/* CTA link */}
                      <Link href="/sobre-nosotros" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '0.55rem', borderRadius: 10,
                        background: 'linear-gradient(135deg,rgba(184,134,11,0.25),rgba(245,200,66,0.15))',
                        border: '1px solid rgba(212,160,23,0.25)',
                        color: '#f5c842', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg,rgba(184,134,11,0.4),rgba(245,200,66,0.25))'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg,rgba(184,134,11,0.25),rgba(245,200,66,0.15))'}
                      >
                        Ver más sobre nosotros →
                      </Link>
                    </div>
                  </div>
                );
              }
              return (
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
              );
            })}

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
                border: '1px solid rgba(212,160,23,0.22)', borderRadius: 20,
                padding: '1.25rem',
                width: services.length > 1 ? 560 : 300,
                maxWidth: '92vw',
                boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)',
                pointerEvents: servOpen ? 'auto' : 'none',
                opacity: servOpen ? 1 : 0,
                transform: servOpen
                  ? 'translateX(-50%) translateY(0)'
                  : 'translateX(-50%) translateY(-6px)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                display: 'grid',
                gridTemplateColumns: services.length > 1 ? '1.15fr 1fr' : '1fr',
                gap: '1.25rem',
              }}>
                {/* Arrow */}
                <div style={{
                  position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                  width: 12, height: 6, overflow: 'hidden',
                }}>
                  <div style={{
                    width: 12, height: 12, background: 'rgba(8,17,32,0.97)',
                    border: '1px solid rgba(212,160,23,0.22)', transform: 'rotate(45deg)',
                    marginTop: 3,
                  }} />
                </div>

                {/* Column: grid of services */}
                <div>
                  <p style={{
                    fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '.14em',
                    color: 'rgba(212,160,23,0.65)', fontWeight: 700, margin: '0 0 0.7rem 0.15rem',
                  }}>
                    Elige tu servicio
                  </p>

                  {services.length === 0 && (
                    <div style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' }}>
                      Cargando…
                    </div>
                  )}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: services.length > 1 ? '1fr 1fr' : '1fr',
                    gap: '0.35rem',
                  }}>
                    {(services.length > 1 ? services.slice(1) : services).map(s => {
                      const href = toSlugUrl(s.link);
                      const active = pathname === href;
                      return (
                        <Link key={s.id} href={href} style={{
                          display: 'flex', alignItems: 'center', gap: 9,
                          padding: '0.5rem 0.6rem', borderRadius: 12,
                          textDecoration: 'none', transition: 'background 0.13s, border-color 0.13s',
                          border: '1px solid transparent',
                          background: active ? 'rgba(212,160,23,0.12)' : 'transparent',
                          borderColor: active ? 'rgba(212,160,23,0.25)' : 'transparent',
                        }}
                          onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; } }}
                          onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; } }}
                        >
                          <div style={{
                            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                            background: active ? 'rgba(212,160,23,0.22)' : 'rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.92rem', transition: 'background 0.13s',
                          }}>
                            {s.icon}
                          </div>
                          <span style={{
                            fontSize: '0.8rem', fontWeight: active ? 600 : 500,
                            color: active ? '#f5c842' : 'rgba(255,255,255,0.85)',
                            lineHeight: 1.25,
                          }}>
                            {s.title}
                          </span>
                        </Link>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                      ¿No sabes por dónde empezar?
                    </span>
                    <a href="https://wa.me/51945203708?text=Hola%2C%20quiero%20cotizar%20un%20evento"
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
                        padding: '0.45rem 0.8rem', borderRadius: 9999,
                        background: 'linear-gradient(135deg,rgba(184,134,11,0.25),rgba(245,200,66,0.15))',
                        border: '1px solid rgba(212,160,23,0.25)',
                        color: '#f5c842', fontSize: '0.74rem', fontWeight: 700, textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg,rgba(184,134,11,0.4),rgba(245,200,66,0.25))'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg,rgba(184,134,11,0.25),rgba(245,200,66,0.15))'}
                    >
                      Cotizar →
                    </a>
                  </div>
                </div>

                {/* Featured column: first service as highlighted card */}
                {services.length > 1 && (() => {
                  const featured = services[0];
                  const href = toSlugUrl(featured.link);
                  return (
                    <Link href={href} style={{
                      position: 'relative', overflow: 'hidden', textDecoration: 'none',
                      borderRadius: 16, padding: '1.1rem',
                      background: 'linear-gradient(160deg, rgba(30,58,95,0.55), rgba(10,22,40,0.4))',
                      border: '1px solid rgba(212,160,23,0.2)',
                      display: 'flex', flexDirection: 'column', gap: '0.6rem',
                    }}>
                      <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        background: 'radial-gradient(circle at 85% 0%, rgba(245,200,66,0.14), transparent 55%)',
                      }} />
                      <span style={{
                        alignSelf: 'flex-start', fontSize: '0.6rem', fontWeight: 700,
                        letterSpacing: '.06em', textTransform: 'uppercase',
                        color: '#0a1628', background: 'linear-gradient(135deg,#b8860b,#f5c842)',
                        padding: '0.25rem 0.55rem', borderRadius: 9999,
                      }}>
                        Destacado
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                          background: 'rgba(212,160,23,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem',
                        }}>
                          {featured.icon}
                        </div>
                        <p style={{ fontFamily: 'var(--font-playfair)', color: '#fff', fontSize: '1.02rem', fontWeight: 700, margin: 0 }}>
                          {featured.title}
                        </p>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, margin: 0 }}>
                        Descubre cómo lo hacemos posible para tu evento.
                      </p>
                      <span style={{
                        marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '0.55rem', borderRadius: 10,
                        background: 'linear-gradient(135deg,#b8860b,#f5c842)',
                        color: '#0a1628', fontSize: '0.8rem', fontWeight: 700,
                      }}>
                        Ver detalles →
                      </span>
                    </Link>
                  );
                })()}
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

          <p style={{ color: 'rgba(212,160,23,0.5)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '.16em', padding: '1.25rem 1rem 0.6rem', margin: 0, fontWeight: 700 }}>
            Servicios
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0 0 0.5rem' }}>
            {services.map(s => {
              const href = toSlugUrl(s.link);
              const active = pathname === href;
              return (
                <Link key={s.id} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0.75rem 0.875rem', fontSize: '0.82rem',
                  color: active ? '#f5c842' : 'rgba(255,255,255,0.8)',
                  textDecoration: 'none',
                  background: active ? 'rgba(212,160,23,0.1)' : 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  border: active ? '1px solid rgba(212,160,23,0.25)' : '1px solid rgba(255,255,255,0.06)',
                  fontWeight: active ? 600 : 500,
                }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: active ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                  }}>{s.icon}</span>
                  <span style={{ lineHeight: 1.3 }}>{s.title}</span>
                </Link>
              );
            })}
          </div>

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
