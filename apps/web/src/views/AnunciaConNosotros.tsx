'use client';
import { useEffect, useRef, useState } from 'react';

/* ─── Animated counter hook ─── */
function useCounter(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return value;
}

/* ─── Intersection observer hook ─── */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── Stat card ─── */
function StatCard({ icon, value, suffix, label, delay, inView }: {
  icon: string; value: number; suffix: string; label: string; delay: number; inView: boolean;
}) {
  const count = useCounter(value, 1800, inView);
  return (
    <div style={{
      flex: '1 1 220px', padding: '2rem 1.5rem', borderRadius: 20,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(212,160,23,0.18)',
      backdropFilter: 'blur(12px)',
      textAlign: 'center',
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    }}>
      <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--font-playfair, Georgia, serif)',
        fontSize: '2.6rem', fontWeight: 700,
        background: 'linear-gradient(135deg,#f5c842,#b8860b)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        lineHeight: 1,
      }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

/* ─── Benefit card ─── */
function BenefitCard({ icon, title, desc, delay, inView }: {
  icon: string; title: string; desc: string; delay: number; inView: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '1 1 260px', padding: '2rem 1.75rem', borderRadius: 20,
        background: hovered ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.25s ease',
        cursor: 'default',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(28px)',
        transitionDelay: `${delay}ms`,
        boxShadow: hovered ? '0 12px 40px rgba(212,160,23,0.12)' : '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14, marginBottom: '1.25rem',
        background: 'linear-gradient(135deg,rgba(184,134,11,0.3),rgba(245,200,66,0.15))',
        border: '1px solid rgba(212,160,23,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem',
        boxShadow: '0 4px 16px rgba(212,160,23,0.15)',
      }}>
        {icon}
      </div>
      <h3 style={{
        fontFamily: 'var(--font-playfair, Georgia, serif)',
        color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.6rem',
      }}>
        {title}
      </h3>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: 1.65, margin: 0 }}>
        {desc}
      </p>
    </div>
  );
}

/* ─── Tier card ─── */
function TierCard({ tier, inView, delay }: {
  tier: { name: string; price: string; period: string; features: string[]; popular?: boolean; cta: string };
  inView: boolean; delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '1 1 260px', borderRadius: 24, padding: tier.popular ? '0.25rem' : '1px',
        background: tier.popular
          ? 'linear-gradient(135deg,#b8860b,#f5c842,#b8860b)'
          : `1px solid ${hovered ? 'rgba(212,160,23,0.3)' : 'rgba(255,255,255,0.08)'}`,
        border: tier.popular ? 'none' : `1px solid ${hovered ? 'rgba(212,160,23,0.3)' : 'rgba(255,255,255,0.08)'}`,
        opacity: inView ? 1 : 0,
        transform: inView
          ? tier.popular ? 'translateY(-8px) scale(1.02)' : 'translateY(0)'
          : 'translateY(32px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
        boxShadow: tier.popular
          ? '0 20px 60px rgba(212,160,23,0.25), 0 0 0 1px rgba(245,200,66,0.1)'
          : hovered ? '0 12px 40px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.2)',
        cursor: 'default',
      }}
    >
      <div style={{
        borderRadius: tier.popular ? 20 : 23,
        background: tier.popular
          ? 'rgba(10,22,40,0.97)'
          : 'rgba(255,255,255,0.03)',
        padding: '2rem 1.75rem',
        height: '100%',
        boxSizing: 'border-box',
        backdropFilter: 'blur(12px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {tier.popular && (
          <div style={{
            position: 'absolute', top: 16, right: 16,
            background: 'linear-gradient(135deg,#b8860b,#f5c842)',
            color: '#0a1628', fontSize: '0.68rem', fontWeight: 800,
            padding: '0.3rem 0.75rem', borderRadius: 999,
            letterSpacing: '.06em', textTransform: 'uppercase',
          }}>
            Más popular
          </div>
        )}

        <div style={{
          color: tier.popular ? '#f5c842' : 'rgba(255,255,255,0.45)',
          fontSize: '0.75rem', fontWeight: 700, letterSpacing: '.1em',
          textTransform: 'uppercase', marginBottom: '0.75rem',
        }}>
          {tier.name}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{
            fontFamily: 'var(--font-playfair, Georgia, serif)',
            fontSize: '2.4rem', fontWeight: 700, color: '#fff',
          }}>
            {tier.price}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', marginLeft: 4 }}>
            {tier.period}
          </span>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          {tier.features.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '0.5rem 0',
              borderBottom: i < tier.features.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: tier.popular
                  ? 'linear-gradient(135deg,#b8860b,#f5c842)'
                  : 'rgba(212,160,23,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem',
                color: tier.popular ? '#0a1628' : '#f5c842',
              }}>
                ✓
              </span>
              <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                {f}
              </span>
            </div>
          ))}
        </div>

        <a
          href="https://wa.me/51945203708?text=Hola%2C%20me%20interesa%20anunciar%20con%20ustedes"
          target="_blank" rel="noopener noreferrer"
          style={{
            display: 'block', width: '100%', padding: '0.8rem',
            borderRadius: 12, textAlign: 'center',
            fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none',
            background: tier.popular
              ? 'linear-gradient(135deg,#b8860b,#f5c842)'
              : 'rgba(212,160,23,0.1)',
            color: tier.popular ? '#0a1628' : '#f5c842',
            border: tier.popular ? 'none' : '1px solid rgba(212,160,23,0.3)',
            transition: 'all 0.15s ease',
            boxSizing: 'border-box',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            if (tier.popular) { el.style.boxShadow = '0 6px 20px rgba(212,160,23,0.4)'; el.style.transform = 'translateY(-1px)'; }
            else { el.style.background = 'rgba(212,160,23,0.18)'; }
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            if (tier.popular) { el.style.boxShadow = 'none'; el.style.transform = 'none'; }
            else { el.style.background = 'rgba(212,160,23,0.1)'; }
          }}
        >
          {tier.cta}
        </a>
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function AnunciaConNosotros() {
  const statsSection  = useInView(0.15);
  const benefitSection = useInView(0.15);
  const tierSection   = useInView(0.1);
  const ctaSection    = useInView(0.2);

  const TIERS = [
    {
      name: 'Básico',
      price: 'S/. 150',
      period: '/mes',
      features: [
        'Logo en el footer del sitio',
        'Mención mensual en redes sociales',
        'Enlace a tu negocio',
      ],
      cta: 'Empezar →',
    },
    {
      name: 'Destacado',
      price: 'S/. 350',
      period: '/mes',
      popular: true,
      features: [
        'Banner en la página principal',
        'Mención en sección de galería',
        'Badge "Partner Verificado"',
        'Logo en footer + redes sociales',
      ],
      cta: 'Elegir Destacado →',
    },
    {
      name: 'Premium',
      price: 'S/. 750',
      period: '/mes',
      features: [
        'Todo lo del plan Destacado',
        'Página propia de partner',
        'Featured en sección de servicios',
        'Reportes mensuales de alcance',
        'Soporte prioritario',
      ],
      cta: 'Contactar →',
    },
  ];

  return (
    <div style={{ background: '#08111f', minHeight: '100vh', paddingTop: 72, color: '#fff' }}>

      {/* ── HERO ── */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        padding: '6rem 1.5rem 5rem',
        textAlign: 'center',
      }}>
        {/* background glow */}
        <div style={{
          position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse,rgba(184,134,11,0.18) 0%,transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0.35rem 1rem', borderRadius: 999, marginBottom: '1.75rem',
            background: 'rgba(212,160,23,0.1)',
            border: '1px solid rgba(212,160,23,0.25)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f5c842' }} />
            <span style={{ color: '#f5c842', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Publicidad & Patrocinios
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-playfair, Georgia, serif)',
            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
            fontWeight: 700, lineHeight: 1.15,
            color: '#fff', margin: '0 0 1.25rem',
          }}>
            Llega a miles de familias<br />
            <span style={{
              background: 'linear-gradient(135deg,#f5c842 0%,#b8860b 60%,#f5c842 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              que celebran
            </span>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.58)', fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            lineHeight: 1.75, margin: '0 auto 2.5rem', maxWidth: 560,
          }}>
            Conecta tu marca con una audiencia local comprometida: personas que están
            activamente planeando bodas, quinceañeras, cumpleaños y eventos corporativos.
          </p>

          <a
            href="#planes"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0.85rem 2.25rem', borderRadius: 9999,
              background: 'linear-gradient(135deg,#b8860b,#f5c842)',
              color: '#0a1628', fontWeight: 700, fontSize: '0.95rem',
              textDecoration: 'none',
              boxShadow: '0 6px 24px rgba(212,160,23,0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 30px rgba(212,160,23,0.5)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(212,160,23,0.35)'; }}
          >
            Ver planes de publicidad ↓
          </a>
        </div>

        {/* gold divider */}
        <div style={{
          margin: '4rem auto 0', width: '100%', maxWidth: 900,
          height: 1,
          background: 'linear-gradient(90deg,transparent,rgba(212,160,23,0.4) 25%,rgba(245,200,66,0.7) 50%,rgba(212,160,23,0.4) 75%,transparent)',
        }} />
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-playfair, Georgia, serif)',
            textAlign: 'center', fontSize: 'clamp(1.4rem, 3vw, 2rem)',
            fontWeight: 700, color: '#fff', margin: '0 0 2.5rem',
          }}>
            Nuestra audiencia en números
          </h2>
          <div ref={statsSection.ref} style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <StatCard icon="👁️" value={10000} suffix="+" label="Visitas por mes" delay={0}   inView={statsSection.inView} />
            <StatCard icon="👨‍👩‍👧" value={85}    suffix="%" label="Familias locales"  delay={100} inView={statsSection.inView} />
            <StatCard icon="⏱️" value={3}      suffix=" min" label="Tiempo promedio en sitio" delay={200} inView={statsSection.inView} />
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section style={{ padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.75rem' }}>
            <p style={{ color: '#f5c842', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
              Por qué anunciar aquí
            </p>
            <h2 style={{
              fontFamily: 'var(--font-playfair, Georgia, serif)',
              fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: '#fff', margin: 0,
            }}>
              Tu marca, en el momento exacto
            </h2>
          </div>
          <div ref={benefitSection.ref} style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <BenefitCard
              icon="🎯" delay={0} inView={benefitSection.inView}
              title="Audiencia segmentada"
              desc="Llegás directamente a personas que están buscando proveedores de eventos. No es tráfico frío — son familias con intención de compra activa."
            />
            <BenefitCard
              icon="✨" delay={120} inView={benefitSection.inView}
              title="Presencia premium"
              desc="Tu marca se asocia con J&M Eventos, una empresa reconocida por lujo y elegancia en decoraciones. El contexto eleva tu percepción de marca."
            />
            <BenefitCard
              icon="📊" delay={240} inView={benefitSection.inView}
              title="ROI medible"
              desc="Rastreamos las consultas generadas desde tu espacio publicitario. Cada mes recibirás un reporte de alcance, clics e interacciones."
            />
          </div>
        </div>
      </section>

      {/* ── TIERS ── */}
      <section id="planes" style={{ padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1020, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ color: '#f5c842', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
              Planes de publicidad
            </p>
            <h2 style={{
              fontFamily: 'var(--font-playfair, Georgia, serif)',
              fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: '#fff', margin: '0 0 0.75rem',
            }}>
              Elige el plan que más se ajusta
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', margin: 0 }}>
              Todos los planes incluyen contrato mensual sin permanencia mínima.
            </p>
          </div>
          <div ref={tierSection.ref} style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
            {TIERS.map((tier, i) => (
              <TierCard key={tier.name} tier={tier} inView={tierSection.inView} delay={i * 120} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '5rem 1.5rem 6rem' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div
            ref={ctaSection.ref}
            style={{
              borderRadius: 28, padding: '3.5rem 2.5rem', textAlign: 'center',
              background: 'linear-gradient(135deg,rgba(184,134,11,0.12),rgba(245,200,66,0.06))',
              border: '1px solid rgba(212,160,23,0.25)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
              opacity: ctaSection.inView ? 1 : 0,
              transform: ctaSection.inView ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 0.65s ease, transform 0.65s ease',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤝</div>
            <h2 style={{
              fontFamily: 'var(--font-playfair, Georgia, serif)',
              fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 700,
              color: '#fff', margin: '0 0 0.75rem',
            }}>
              ¿Interesado? Conversemos
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', lineHeight: 1.7, margin: '0 0 2rem' }}>
              Cuéntanos sobre tu negocio y te ayudamos a elegir el plan ideal.
              Sin compromisos — solo una charla rápida.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="https://wa.me/51945203708?text=Hola%2C%20me%20interesa%20anunciar%20con%20ustedes%20en%20J%26M%20Eventos"
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '0.85rem 1.75rem', borderRadius: 9999,
                  background: 'linear-gradient(135deg,#b8860b,#f5c842)',
                  color: '#0a1628', fontWeight: 700, fontSize: '0.9rem',
                  textDecoration: 'none',
                  boxShadow: '0 6px 20px rgba(212,160,23,0.35)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 28px rgba(212,160,23,0.5)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(212,160,23,0.35)'; }}
              >
                💬 WhatsApp
              </a>

              <a
                href="mailto:djjofer.25@gmail.com?subject=Publicidad%20en%20J%26M%20Eventos&body=Hola%2C%20me%20interesa%20anunciar%20en%20su%20sitio."
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '0.85rem 1.75rem', borderRadius: 9999,
                  background: 'rgba(212,160,23,0.1)',
                  border: '1px solid rgba(212,160,23,0.3)',
                  color: '#f5c842', fontWeight: 700, fontSize: '0.9rem',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,0.18)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,0.1)'}
              >
                ✉️ Correo
              </a>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', marginTop: '1.5rem', marginBottom: 0 }}>
              Respondemos en menos de 24 horas hábiles
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
