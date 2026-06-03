'use client';
import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  tier: { name: string; price: string; period: string; features: string[]; popular?: boolean; cta: string; color: string; icon: string };
  inView: boolean; delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [shine, setShine] = useState({ x: 50, y: 50 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: { clientX: number; clientY: number }) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setShine({ x, y });
  };

  return (
    <div
      style={{
        flex: '1 1 260px',
        position: 'relative',
        opacity: inView ? 1 : 0,
        transform: inView
          ? tier.popular ? 'translateY(-10px) scale(1.03)' : 'translateY(0)'
          : 'translateY(32px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {/* ── card__glow — difuso exterior, sigue al mouse ── */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '80%', height: '80%',
        transform: `translate(calc(-50% + ${(shine.x - 50) * 0.3}px), calc(-50% + ${(shine.y - 50) * 0.3}px))`,
        background: tier.popular
          ? `radial-gradient(ellipse at center, rgba(212,160,23,0.55) 0%, transparent 70%)`
          : `radial-gradient(ellipse at center, rgba(212,160,23,0.28) 0%, transparent 70%)`,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.4s ease',
        filter: 'blur(24px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ── card wrapper con borde ── */}
      <div
        ref={cardRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setShine({ x: 50, y: 50 }); }}
        onMouseMove={handleMouseMove}
        style={{
          position: 'relative', zIndex: 1,
          borderRadius: 24,
          border: tier.popular
            ? '1.5px solid rgba(245,200,66,0.6)'
            : `1px solid ${hovered ? 'rgba(212,160,23,0.35)' : 'rgba(255,255,255,0.07)'}`,
          background: tier.popular ? 'rgba(9,19,36,0.98)' : 'rgba(11,21,38,0.94)',
          backdropFilter: 'blur(16px)',
          overflow: 'hidden',
          cursor: 'default',
          boxShadow: tier.popular
            ? hovered
              ? '0 28px 70px rgba(212,160,23,0.3), 0 0 0 1px rgba(245,200,66,0.1)'
              : '0 16px 50px rgba(212,160,23,0.18)'
            : hovered
              ? '0 16px 48px rgba(0,0,0,0.45)'
              : '0 4px 20px rgba(0,0,0,0.25)',
          transition: 'box-shadow 0.35s ease, border-color 0.35s ease',
        }}
      >
        {/* ── card__shine — radial que sigue al cursor ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', borderRadius: 24,
          background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.08) 0%, transparent 55%)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }} />

        {/* ── card__image — bloque de color en la parte superior ── */}
        <div style={{
          width: '100%', height: 110,
          background: tier.color,
          position: 'relative', overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* brillo interno sobre la imagen */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.18) 0%, transparent 60%)`,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }} />
          {/* icono central */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.2rem',
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
          }}>
            {tier.icon}
          </div>
        </div>

        {/* ── card__content ── */}
        <div style={{ padding: '1.5rem 1.75rem 1.75rem', position: 'relative', zIndex: 2 }}>

          {/* ── card__badge ── */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginBottom: '0.9rem',
          }}>
            <span style={{
              background: tier.popular
                ? 'linear-gradient(135deg,#b8860b,#f5c842)'
                : 'rgba(212,160,23,0.15)',
              color: tier.popular ? '#0a1628' : '#f5c842',
              fontSize: '0.65rem', fontWeight: 800,
              padding: '0.22rem 0.65rem', borderRadius: 999,
              letterSpacing: '.08em', textTransform: 'uppercase',
              border: tier.popular ? 'none' : '1px solid rgba(212,160,23,0.3)',
              boxShadow: tier.popular ? '0 2px 8px rgba(212,160,23,0.35)' : 'none',
            }}>
              {tier.popular ? 'Más popular' : tier.name}
            </span>
          </div>

          {/* precio */}
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{
              fontFamily: 'var(--font-playfair, Georgia, serif)',
              fontSize: '2.2rem', fontWeight: 700, color: '#fff', lineHeight: 1,
            }}>
              {tier.price}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', marginLeft: 5 }}>
              {tier.period}
            </span>
          </div>

          {/* features */}
          <div style={{ marginBottom: '1.5rem' }}>
            {tier.features.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 9,
                padding: '0.42rem 0',
                borderBottom: i < tier.features.length - 1
                  ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <span style={{
                  width: 17, height: 17, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  background: tier.popular
                    ? 'linear-gradient(135deg,#b8860b,#f5c842)'
                    : 'rgba(212,160,23,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.55rem',
                  color: tier.popular ? '#0a1628' : '#f5c842',
                }}>✓</span>
                <span style={{ color: 'rgba(255,255,255,0.68)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {f}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <a
            href="https://wa.me/51902508499?text=Hola%2C%20me%20interesa%20anunciar%20con%20ustedes"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '0.8rem 1rem',
              borderRadius: 12, textDecoration: 'none',
              fontWeight: 700, fontSize: '0.875rem',
              background: tier.popular
                ? 'linear-gradient(135deg,#b8860b,#f5c842)'
                : 'rgba(212,160,23,0.08)',
              color: tier.popular ? '#0a1628' : '#f5c842',
              border: tier.popular ? 'none' : '1px solid rgba(212,160,23,0.22)',
              transition: 'all 0.18s ease',
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              if (tier.popular) { el.style.boxShadow = '0 6px 22px rgba(212,160,23,0.45)'; el.style.transform = 'translateY(-1px)'; }
              else { el.style.background = 'rgba(212,160,23,0.16)'; }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              if (tier.popular) { el.style.boxShadow = 'none'; el.style.transform = 'none'; }
              else { el.style.background = 'rgba(212,160,23,0.08)'; }
            }}
          >
            <span>{tier.cta}</span>
            <span style={{
              width: 28, height: 28, borderRadius: '50%',
              background: tier.popular ? 'rgba(0,0,0,0.15)' : 'rgba(212,160,23,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.85rem', flexShrink: 0,
            }}>→</span>
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Default data ─── */
const DEFAULT_STATS = [
  { icon:'👁️', value:10000, suffix:'+', label:'Visitas por mes' },
  { icon:'👨‍👩‍👧', value:85,    suffix:'%', label:'Familias locales' },
  { icon:'⏱️', value:3,      suffix:' min', label:'Tiempo promedio en sitio' },
];
const DEFAULT_BENEFITS = [
  { icon:'🎯', title:'Audiencia segmentada', desc:'Llegás directamente a personas que están buscando proveedores de eventos. No es tráfico frío — son familias con intención de compra activa.' },
  { icon:'✨', title:'Presencia premium', desc:'Tu marca se asocia con J&M Eventos, una empresa reconocida por lujo y elegancia en decoraciones. El contexto eleva tu percepción de marca.' },
  { icon:'📊', title:'ROI medible', desc:'Rastreamos las consultas generadas desde tu espacio publicitario. Cada mes recibirás un reporte de alcance, clics e interacciones.' },
];
const DEFAULT_TIERS = [
  { name:'Básico', price:'S/. 150', period:'/mes', color:'linear-gradient(135deg,#1e3a5f 0%,#2d5986 100%)', icon:'🏷️', features:['Logo en el footer del sitio','Mención mensual en redes sociales','Enlace a tu negocio'], cta:'Empezar' },
  { name:'Destacado', price:'S/. 350', period:'/mes', popular:true, color:'linear-gradient(135deg,#7a5800 0%,#c49000 50%,#f5c842 100%)', icon:'⭐', features:['Banner en la página principal','Mención en sección de galería','Badge "Partner Verificado"','Logo en footer + redes sociales'], cta:'Elegir Destacado' },
  { name:'Premium', price:'S/. 750', period:'/mes', color:'linear-gradient(135deg,#3b1a6e 0%,#6b32b8 60%,#9b59e8 100%)', icon:'👑', features:['Todo lo del plan Destacado','Página propia de partner','Featured en sección de servicios','Reportes mensuales de alcance','Soporte prioritario'], cta:'Contactar' },
];

/* ─── Main component ─── */
export default function AnunciaConNosotros() {
  const statsSection   = useInView(0.15);
  const benefitSection = useInView(0.15);
  const tierSection    = useInView(0.1);
  const ctaSection     = useInView(0.2);

  const [cms, setCms] = useState<any>({});

  useEffect(() => {
    getDoc(doc(db, 'site_config', 'anuncia')).then(s => {
      if (s.exists()) setCms(s.data());
    }).catch(() => {});
  }, []);

  const activeTiers   = (cms.anunciaTiers   && cms.anunciaTiers.length   > 0) ? cms.anunciaTiers.filter((t:any) => t.visible !== false)   : DEFAULT_TIERS;
  const activeStats   = (cms.anunciaStats   && cms.anunciaStats.length   > 0) ? cms.anunciaStats.filter((s:any) => s.visible !== false)   : DEFAULT_STATS;
  const activeBenefits= (cms.anunciaBenefits&& cms.anunciaBenefits.length> 0) ? cms.anunciaBenefits.filter((b:any)=> b.visible !== false) : DEFAULT_BENEFITS;

  return (
    <div style={{ background: '#08111f', minHeight: '100vh', paddingTop: 72, color: '#fff' }}>
      <style>{`
        @media(max-width:640px){
          .anuncia-hero-section{ padding:4rem 1rem 3.5rem !important; }
          .anuncia-cta-box{ padding:2.5rem 1.25rem !important; border-radius:20px !important; }
          .anuncia-cta-btns{ flex-direction:column; align-items:stretch; }
          .anuncia-cta-btns a{ text-align:center; justify-content:center; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section className="anuncia-hero-section" style={{
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
              {cms.heroBadge || 'Publicidad & Patrocinios'}
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-playfair, Georgia, serif)',
            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
            fontWeight: 700, lineHeight: 1.15,
            color: '#fff', margin: '0 0 1.25rem',
          }}>
            {cms.heroTitle1 || 'Llega a miles de familias'}<br />
            <span style={{
              background: 'linear-gradient(135deg,#f5c842 0%,#b8860b 60%,#f5c842 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {cms.heroTitleGold || 'que celebran'}
            </span>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.58)', fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            lineHeight: 1.75, margin: '0 auto 2.5rem', maxWidth: 560,
          }}>
            {cms.heroDesc || 'Conecta tu marca con una audiencia local comprometida: personas que están activamente planeando bodas, quinceañeras, cumpleaños y eventos corporativos.'}
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
            {cms.heroCta || 'Ver planes de publicidad ↓'}
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
            {cms.statsTitle || 'Nuestra audiencia en números'}
          </h2>
          <div ref={statsSection.ref} style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {activeStats.map((s: any, i: number) => (
              <StatCard key={i} icon={s.icon} value={Number(s.value)} suffix={s.suffix} label={s.label} delay={i*100} inView={statsSection.inView}/>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section style={{ padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.75rem' }}>
            <p style={{ color: '#f5c842', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
              {cms.benefitsBadge || 'Por qué anunciar aquí'}
            </p>
            <h2 style={{
              fontFamily: 'var(--font-playfair, Georgia, serif)',
              fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: '#fff', margin: 0,
            }}>
              {cms.benefitsTitle || 'Tu marca, en el momento exacto'}
            </h2>
          </div>
          <div ref={benefitSection.ref} style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            {activeBenefits.map((b: any, i: number) => (
              <BenefitCard key={i} icon={b.icon} title={b.title} desc={b.desc} delay={i*120} inView={benefitSection.inView}/>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIERS ── */}
      <section id="planes" style={{ padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1020, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ color: '#f5c842', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
              {cms.tiersTitle || 'Planes de publicidad'}
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
            {activeTiers.map((tier: any, i: number) => (
              <TierCard key={tier.name||i} tier={tier} inView={tierSection.inView} delay={i * 120} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '5rem 1.5rem 6rem' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div
            ref={ctaSection.ref}
            className="anuncia-cta-box"
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
              {cms.ctaTitle || '¿Interesado? Conversemos'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', lineHeight: 1.7, margin: '0 0 2rem' }}>
              {cms.ctaDesc || 'Cuéntanos sobre tu negocio y te ayudamos a elegir el plan ideal. Sin compromisos — solo una charla rápida.'}
            </p>

            <div className="anuncia-cta-btns" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {cms.ctaBtn1Url ? (
                <a href={cms.ctaBtn1Url} target="_blank" rel="noopener noreferrer"
                   style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0.85rem 1.75rem', borderRadius:9999, background:'linear-gradient(135deg,#b8860b,#f5c842)', color:'#0a1628', fontWeight:700, fontSize:'0.9rem', textDecoration:'none', boxShadow:'0 6px 20px rgba(212,160,23,0.35)', transition:'transform 0.15s, box-shadow 0.15s' }}
                   onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 10px 28px rgba(212,160,23,0.5)'; }}
                   onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='none'; (e.currentTarget as HTMLElement).style.boxShadow='0 6px 20px rgba(212,160,23,0.35)'; }}>
                  {cms.ctaBtn1 || '✉️ Enviar propuesta'}
                </a>
              ) : (
                <a href="https://wa.me/51945203708?text=Hola%2C%20me%20interesa%20anunciar%20con%20ustedes%20en%20J%26M%20Eventos"
                   target="_blank" rel="noopener noreferrer"
                   style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0.85rem 1.75rem', borderRadius:9999, background:'linear-gradient(135deg,#b8860b,#f5c842)', color:'#0a1628', fontWeight:700, fontSize:'0.9rem', textDecoration:'none', boxShadow:'0 6px 20px rgba(212,160,23,0.35)', transition:'transform 0.15s, box-shadow 0.15s' }}
                   onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 10px 28px rgba(212,160,23,0.5)'; }}
                   onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='none'; (e.currentTarget as HTMLElement).style.boxShadow='0 6px 20px rgba(212,160,23,0.35)'; }}>
                  💬 WhatsApp
                </a>
              )}
              {cms.ctaBtn2Url && (
                <a href={cms.ctaBtn2Url} target="_blank" rel="noopener noreferrer"
                   style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0.85rem 1.75rem', borderRadius:9999, background:'rgba(212,160,23,0.12)', color:'#f5c842', fontWeight:700, fontSize:'0.9rem', textDecoration:'none', border:'1px solid rgba(212,160,23,0.3)', transition:'transform 0.15s' }}
                   onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; }}
                   onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='none'; }}>
                  {cms.ctaBtn2 || '💬 Otra opción'}
                </a>
              )}
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
