'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/* ── Datos estáticos (fallback) ── */
const STATS_DEFAULT = [
  { n:'+500', label:'Eventos realizados', icon:'🎉', color:'rgba(212,160,23,0.15)', border:'rgba(212,160,23,0.3)' },
  { n:'10+',  label:'Años de trayectoria',icon:'⭐', color:'rgba(37,99,235,0.12)',  border:'rgba(37,99,235,0.3)' },
  { n:'100%', label:'Satisfacción',       icon:'💎', color:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.3)' },
  { n:'6',    label:'Servicios únicos',   icon:'🎭', color:'rgba(139,92,246,0.12)', border:'rgba(139,92,246,0.3)' },
];

const COLORES_STATS = [
  { color:'rgba(212,160,23,0.15)', border:'rgba(212,160,23,0.3)' },
  { color:'rgba(37,99,235,0.12)',  border:'rgba(37,99,235,0.3)' },
  { color:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.3)' },
  { color:'rgba(139,92,246,0.12)', border:'rgba(139,92,246,0.3)' },
];

const VALORES_DEFAULT = [
  { icon:'❤️', g:'#ff6b9d,#c44a7a', title:'Pasión por los Detalles',  desc:'Cada elemento diseñado con amor para que tu evento sea irrepetible.' },
  { icon:'🎯', g:'#f59e0b,#d97706', title:'Compromiso Total',          desc:'Puntualidad, profesionalismo y resultados que superan las expectativas.' },
  { icon:'✨', g:'#8b5cf6,#6d28d9', title:'Creatividad sin Límites',   desc:'Experiencias adaptadas a tu visión, estilo y presupuesto.' },
  { icon:'🤝', g:'#10b981,#059669', title:'Trato Familiar',            desc:'Te acompañamos como si fuéramos parte de tu familia.' },
  { icon:'🏆', g:'#3b82f6,#1d4ed8', title:'Calidad Premium',           desc:'Materiales de primera y talento profesional en cada servicio.' },
  { icon:'🌟', g:'#ec4899,#be185d', title:'Momentos Eternos',          desc:'No organizamos eventos, creamos recuerdos de por vida.' },
];

const HITOS_DEFAULT = [
  { year:'2014', label:'El Comienzo',      desc:'Primer show infantil en Sechura. Una familia, un sueño.' },
  { year:'2016', label:'Primera Expansión',desc:'Decoración temática, hora loca y fotografía al catálogo.' },
  { year:'2019', label:'Mundo Corporativo',desc:'Activaciones empresariales para grandes marcas de Piura.' },
  { year:'2024', label:'Líderes Regionales',desc:'+500 eventos exitosos y la confianza de cientos de familias.' },
];

/* ── Orb flotante animado ── */
function FloatingOrb({ size, x, y, color, dur, delay }: any) {
  return (
    <div style={{
      position:'absolute', borderRadius:'50%',
      width:size, height:size,
      left:`${x}%`, top:`${y}%`,
      background:`radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`,
      filter:'blur(40px)', opacity:.6,
      animation:`orbDrift ${dur}s ease-in-out infinite ${delay}s`,
      pointerEvents:'none',
    }}/>
  );
}

/* ── Partículas estrella — deterministas ── */
function StarField({ count = 20, light = false }: { count?: number; light?: boolean }) {
  const stars = Array.from({ length: count }, (_, i) => ({
    x:   (i * 53 + 7)  % 100,
    y:   (i * 37 + 13) % 100,
    s:   1 + (i % 3),
    dur: 3 + (i % 5),
    del: (i % 4) * 0.8,
    op:  light
      ? 0.08 + ((i * 17 + 3) % 10) * 0.008
      : 0.10 + ((i * 13 + 5) % 15) * 0.010,
  }));
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
      {stars.map((st, i) => (
        <div key={i} style={{
          position:'absolute',
          left:`${st.x}%`, top:`${st.y}%`,
          width:st.s, height:st.s, borderRadius:'50%',
          background: light
            ? `rgba(10,22,40,${st.op.toFixed(3)})`
            : `rgba(255,255,255,${st.op.toFixed(3)})`,
          animation:`starFloat ${st.dur}s ease-in-out infinite ${st.del}s`,
        }}/>
      ))}
    </div>
  );
}

/* ── Card valor con tilt 3D + hover glow ── */
function ValorCard({ v, i }: { v: typeof VALORES_DEFAULT[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number>(0);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX-r.left)/r.width  - 0.5) * 22;
      const y = ((e.clientY-r.top) /r.height - 0.5) * -22;
      el.style.transform = `perspective(700px) rotateX(${y}deg) rotateY(${x}deg) translateY(-10px) scale(1.04)`;
      el.style.boxShadow = `0 28px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)`;
      const glow = el.querySelector('.vcard-glow') as HTMLElement|null;
      if (glow) {
        const px = (e.clientX-r.left)/r.width*100;
        const py = (e.clientY-r.top)/r.height*100;
        glow.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.08), transparent 60%)`;
      }
    });
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current; if (!el) return;
    el.style.transition = 'transform .6s cubic-bezier(0.23,1,0.32,1), box-shadow .6s ease';
    el.style.transform  = '';
    el.style.boxShadow  = '0 4px 24px rgba(0,0,0,0.2)';
    const glow = el.querySelector('.vcard-glow') as HTMLElement|null;
    if (glow) glow.style.background = 'transparent';
  }, []);

  return (
    <div ref={ref}
         className={`sn3-reveal stg-${i+1}`}
         onMouseMove={onMove}
         onMouseLeave={onLeave}
         style={{
           borderRadius:24, padding:'2rem', position:'relative', overflow:'hidden',
           background:'rgba(255,255,255,0.04)',
           border:'1px solid rgba(255,255,255,0.08)',
           boxShadow:'0 4px 24px rgba(0,0,0,0.2)',
           transformStyle:'preserve-3d', willChange:'transform',
           cursor:'default',
           animation:`cardLevitate ${4+i*0.4}s ease-in-out infinite ${i*0.5}s`,
         }}>

      <div className="vcard-glow" style={{ position:'absolute', inset:0, borderRadius:24, transition:'background .2s', pointerEvents:'none' }}/>

      <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%',
                    background:`linear-gradient(135deg,${v.g})`, opacity:.12, filter:'blur(16px)', pointerEvents:'none' }}/>

      <div style={{
        width:58, height:58, borderRadius:18, marginBottom:'1.25rem',
        background:`linear-gradient(135deg,${v.g})`,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.65rem',
        boxShadow:`0 8px 28px rgba(0,0,0,0.35)`,
        animation:`iconSpin ${5+i*0.6}s ease-in-out infinite ${i*0.3}s`,
      }}>
        {v.icon}
      </div>

      <h3 style={{ fontFamily:'var(--font-playfair)', color:'#fff', fontSize:'1.05rem', fontWeight:700, margin:'0 0 8px' }}>
        {v.title}
      </h3>
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.86rem', lineHeight:1.7, margin:0 }}>
        {v.desc}
      </p>

      <div style={{ position:'absolute', bottom:0, left:'10%', right:'10%', height:1,
                    background:`linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)` }}/>
    </div>
  );
}

export default function SobreNosotrosClient() {
  const [cfg, setCfg] = useState<Record<string,any>>({});

  /* Load from Firebase */
  useEffect(() => {
    getDoc(doc(db, 'site_config', 'nosotros')).then(snap => {
      if (snap.exists()) setCfg(snap.data());
    });
  }, []);

  /* Derived data with fallbacks */
  const heroBadge     = cfg.heroBadge     || '✦ Sechura, Piura · Desde 2014';
  const heroTitle1    = cfg.heroTitle1    || 'Somos los que';
  const heroHighlight = cfg.heroHighlight || 'hacen magia';
  const heroTitle3    = cfg.heroTitle3    || 'en tu fiesta';
  const heroDesc      = cfg.heroDesc      || 'Más de una década transformando celebraciones en experiencias únicas e inolvidables en Sechura, Piura.';

  const STATS: typeof STATS_DEFAULT = ['1','2','3','4'].map((n,i) => ({
    n:     cfg[`sn${n}num`]   || STATS_DEFAULT[i].n,
    label: cfg[`sn${n}label`] || STATS_DEFAULT[i].label,
    icon:  cfg[`sn${n}icon`]  || STATS_DEFAULT[i].icon,
    ...COLORES_STATS[i],
  }));

  const histSubtitle = cfg.histSubtitle || 'Nuestra trayectoria';
  const histH2Gold   = cfg.histH2Gold   || 'construyendo\nmagia';
  const histDesc     = cfg.histDesc     || 'De un primer show infantil en Sechura a convertirnos en la empresa de eventos más completa de la región.';
  const HITOS        = (cfg.hitos && cfg.hitos.length > 0) ? cfg.hitos : HITOS_DEFAULT;

  const VALORES      = (cfg.valores && cfg.valores.length > 0)
    ? cfg.valores.map((v: any) => ({ ...v, g: v.gradient || v.g || '#f59e0b,#d97706' }))
    : VALORES_DEFAULT;

  const misionSubtitle = cfg.misionSubtitle || 'Por qué existimos';
  const misionH2       = cfg.misionH2       || 'Creamos recuerdos que duran toda la vida';
  const misionP1       = cfg.misionP1       || 'En J&M Eventos no solo organizamos celebraciones — diseñamos experiencias. Cada detalle está pensado para que tus invitados vivan momentos únicos.';
  const misionP2       = cfg.misionP2       || 'Más de una década en Sechura nos ha enseñado que la clave está en escuchar tus sueños y convertirlos en realidad.';
  const MISION_CARDS = (cfg.misionCards && cfg.misionCards.length > 0) ? cfg.misionCards : [
    { icon:'🎭', title:'Shows con personajes únicos',      desc:'Animadores que hacen vivir los personajes favoritos de los niños.' },
    { icon:'🎨', title:'Decoración de otra dimensión',     desc:'Cada espacio transformado en un mundo de fantasía y color personalizado.' },
    { icon:'📸', title:'Momentos capturados para siempre', desc:'Fotografía y video profesional de cada instante de tu celebración.' },
  ];

  const ctaBadge   = cfg.ctaBadge  || '¿Lista tu celebración?';
  const ctaH2      = cfg.ctaH2     || 'Tu evento soñado comienza aquí';
  const ctaDesc    = cfg.ctaDesc   || 'Cuéntanos tu sueño y nos encargamos de cada detalle para que solo tengas que disfrutar.';
  const ctaBtn1    = cfg.ctaBtn1   || '✨ Empezar a planear';
  const ctaBtn1Url = cfg.ctaBtn1Url|| '/contacto';
  const ctaBtn2    = cfg.ctaBtn2   || '💬 Hablar por WhatsApp';
  const ctaBtn2Url = cfg.ctaBtn2Url|| 'https://wa.me/51945203708';

  /* Reveal on scroll */
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('sn3-vis'); obs.unobserve(e.target); } });
    }, { threshold:0.08, rootMargin:'0px 0px -40px 0px' });
    document.querySelectorAll('.sn3-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* Mouse parallax en hero */
  const heroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const x = (e.clientX/window.innerWidth  - 0.5) * 30;
      const y = (e.clientY/window.innerHeight - 0.5) * 30;
      heroRef.current.querySelectorAll<HTMLElement>('[data-depth]').forEach(el => {
        const d = parseFloat(el.dataset.depth||'1');
        el.style.transform = `translate(${x*d}px,${y*d}px)`;
      });
    };
    window.addEventListener('mousemove', h, { passive:true });
    return () => window.removeEventListener('mousemove', h);
  }, []);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          HERO — DARK COSMOS
      ════════════════════════════════════════════════════════ */}
      <section ref={heroRef} style={{
        minHeight:'100vh', display:'flex', alignItems:'center',
        background:'radial-gradient(ellipse 100% 80% at 50% 30%, #0f2044 0%, #050d1a 55%, #000 100%)',
        position:'relative', overflow:'hidden', paddingTop:80,
      }}>
        <StarField count={28}/>

        <div data-depth="0.3" style={{ position:'absolute', top:'15%', left:'60%', transition:'transform .1s linear' }}>
          <FloatingOrb size={500} x={0} y={0} color="rgba(212,160,23,0.18)" dur={8} delay={0}/>
        </div>
        <div data-depth="0.5" style={{ position:'absolute', top:'50%', left:'10%', transition:'transform .1s linear' }}>
          <FloatingOrb size={350} x={0} y={0} color="rgba(37,99,235,0.15)" dur={10} delay={2}/>
        </div>
        <div data-depth="0.2" style={{ position:'absolute', bottom:'10%', right:'5%', transition:'transform .1s linear' }}>
          <FloatingOrb size={250} x={0} y={0} color="rgba(139,92,246,0.12)" dur={7} delay={1}/>
        </div>

        {[700,520,360,220].map((s,i) => (
          <div key={s} data-depth={0.1+i*0.05} style={{
            position:'absolute', top:'50%', left:'72%',
            width:s, height:s, borderRadius:'50%',
            border:`1px solid rgba(212,160,23,${0.04+i*0.025})`,
            transform:`translate(-50%,-50%)`,
            animation:`ringRot ${18+i*6}s linear infinite ${i%2===0?'':'reverse'}`,
            pointerEvents:'none', transition:'transform .1s linear',
          }}/>
        ))}

        <div className="container" style={{ position:'relative', zIndex:10 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:'4rem', alignItems:'center' }}
               className="sn3-hero-grid">

            <div>
              <div className="sn3-reveal stg-1">
                <span style={{
                  display:'inline-flex', alignItems:'center', gap:8,
                  padding:'0.4rem 1.25rem', borderRadius:9999,
                  background:'rgba(212,160,23,0.1)', border:'1px solid rgba(212,160,23,0.3)',
                  color:'#d4a017', fontSize:'0.68rem', fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'.22em',
                  animation:'pillFloat 4s ease-in-out infinite',
                }}>
                  {heroBadge}
                </span>
              </div>

              <h1 className="sn3-reveal stg-2" style={{
                fontFamily:'var(--font-playfair)', fontSize:'clamp(2.2rem,6vw,5.5rem)',
                color:'#fff', lineHeight:1.05, fontWeight:700, margin:'1.5rem 0',
              }}>
                {heroTitle1}<br/>
                <span style={{
                  background:'linear-gradient(135deg,#b8860b 0%,#f5c842 40%,#b8860b 80%)',
                  backgroundSize:'200% auto', WebkitBackgroundClip:'text',
                  WebkitTextFillColor:'transparent', backgroundClip:'text',
                  animation:'textShimmer 4s linear infinite', fontStyle:'italic',
                }}>{heroHighlight}</span><br/>
                {heroTitle3}
              </h1>

              <p className="sn3-reveal stg-3" style={{ color:'rgba(255,255,255,0.58)', fontSize:'1.1rem', lineHeight:1.85, maxWidth:480, marginBottom:'2.5rem' }}>
                {heroDesc}
              </p>

              <div className="sn3-reveal stg-4 sn3-cta-btns" style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
                {[
                  { label:'✨ Cotizar mi evento', href:'/contacto', bg:'linear-gradient(135deg,#b8860b,#f5c842)', color:'#0a1628', shadow:'rgba(212,160,23,0.45)' },
                  { label:'Ver galería →',        href:'/galeria',  bg:'rgba(255,255,255,0.06)',                                  color:'rgba(255,255,255,0.85)', shadow:'transparent', border:'1.5px solid rgba(255,255,255,0.2)' },
                ].map(({ label, href, bg, color, shadow, border }) => (
                  <a key={href} href={href} style={{
                    display:'inline-flex', alignItems:'center', gap:8,
                    padding:'1rem 2rem', borderRadius:9999, background:bg, color,
                    fontWeight:700, fontSize:'0.95rem', textDecoration:'none',
                    boxShadow:`0 4px 24px ${shadow}`,
                    border: border||'none',
                    transition:'all .35s cubic-bezier(0.23,1,0.32,1)',
                  }}
                  onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='translateY(-4px) scale(1.03)';el.style.boxShadow=`0 16px 40px ${shadow}`;}}
                  onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='';el.style.boxShadow=`0 4px 24px ${shadow}`;}}>
                    {label}
                  </a>
                ))}
              </div>
            </div>

            <div className="sn3-reveal stg-3" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              {STATS.map(({ n, label, icon, color, border }, i) => (
                <div key={i} style={{
                  padding:'1.75rem 1.25rem', borderRadius:22, textAlign:'center',
                  background:color, border:`1px solid ${border}`,
                  backdropFilter:'blur(12px)',
                  boxShadow:'0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)',
                  animation:`cardLevitate ${3.5+i*0.6}s ease-in-out infinite ${i*0.5}s`,
                  transition:'transform .3s, box-shadow .3s', cursor:'default',
                }}
                onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.filter='brightness(1.3)';el.style.boxShadow='0 20px 48px rgba(0,0,0,0.4)';}}
                onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.filter='';el.style.boxShadow='0 8px 32px rgba(0,0,0,0.25)';}}>
                  <div style={{ fontSize:'1.8rem', marginBottom:'0.5rem', animation:`iconSpin ${4+i*0.5}s ease-in-out infinite ${i*0.4}s` }}>{icon}</div>
                  <p style={{ fontFamily:'var(--font-playfair)', fontSize:'2.25rem', fontWeight:700, color:'#f5c842', margin:'0 0 4px', lineHeight:1 }}>{n}</p>
                  <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'0.75rem', margin:0, lineHeight:1.3 }}>{label}</p>
                </div>
              ))}

              <div style={{ gridColumn:'span 2', padding:'1rem 1.25rem', borderRadius:18,
                             background:'linear-gradient(135deg,rgba(212,160,23,0.1),rgba(212,160,23,0.05))',
                             border:'1px solid rgba(212,160,23,0.2)', backdropFilter:'blur(8px)',
                             display:'flex', alignItems:'center', gap:12,
                             animation:'pillFloat 5s ease-in-out infinite 1s' }}>
                <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#b8860b,#f5c842)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>🎉</div>
                <div>
                  <p style={{ color:'#f5c842', fontWeight:700, fontSize:'0.88rem', margin:0, fontFamily:'var(--font-playfair)' }}>J&M Eventos y Decoraciones</p>
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.68rem', margin:0 }}>La primera opción en Sechura, Piura</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position:'absolute', bottom:'2rem', left:'50%', transform:'translateX(-50%)', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
          <div style={{ width:26, height:42, borderRadius:13, border:'1.5px solid rgba(255,255,255,0.15)', display:'flex', justifyContent:'center', paddingTop:7 }}>
            <div style={{ width:3, height:7, borderRadius:9999, background:'rgba(255,255,255,0.4)', animation:'scrollBob 1.6s ease-in-out infinite' }}/>
          </div>
          <p style={{ color:'rgba(255,255,255,0.2)', fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:'.18em', margin:0 }}>Scroll</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TIMELINE — HISTORIA
      ════════════════════════════════════════════════════════ */}
      <section className="sn3-timeline-section" style={{ padding:'8rem 0', background:'#fff', position:'relative', overflow:'hidden' }}>
        <StarField count={12} light/>

        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) rotate(-8deg)',
                     fontSize:'clamp(5rem,13vw,11rem)', fontFamily:'var(--font-playfair)', fontWeight:900,
                     color:'rgba(10,22,40,0.02)', whiteSpace:'nowrap', pointerEvents:'none', userSelect:'none' }}>
          HISTORIA
        </div>

        <div className="container" style={{ position:'relative', zIndex:2 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6rem', alignItems:'start' }}
               className="sn3-hist-grid">

            <div style={{ position:'sticky', top:'7rem' }}>
              <p className="sn3-reveal" style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.25em', color:'#d4a017', marginBottom:12 }}>
                {histSubtitle}
              </p>
              <h2 className="sn3-reveal stg-2" style={{ fontFamily:'var(--font-playfair)', fontSize:'clamp(2.5rem,4vw,3.75rem)', color:'#0a1628', lineHeight:1.05, marginBottom:'1.5rem' }}>
                Una década<br/><span style={{ color:'#d4a017', fontStyle:'italic' }}>{histH2Gold.split('\n').map((l:string,i:number)=><span key={i}>{l}{i===0&&histH2Gold.includes('\n')?<br/>:null}</span>)}</span>
              </h2>
              <p className="sn3-reveal stg-3" style={{ color:'#64748b', fontSize:'1.05rem', lineHeight:1.85, maxWidth:380 }}>
                {histDesc}
              </p>
            </div>

            <div className="sn3-timeline-col" style={{ position:'relative', paddingLeft:'2.5rem' }}>
              <div style={{ position:'absolute', left:0, top:'1.5rem', bottom:'1.5rem', width:2,
                             background:'linear-gradient(to bottom,#d4a017,rgba(212,160,23,0.1))', borderRadius:9999,
                             animation:'lineGlow 3s ease-in-out infinite' }}/>

              {HITOS.map((h: typeof HITOS_DEFAULT[0], i: number) => (
                <div key={i} className={`sn3-reveal stg-${i+1}`}
                     style={{ marginBottom:i<HITOS.length-1?'3rem':0, position:'relative' }}>
                  <div style={{
                    position:'absolute', left:'-2.5rem', top:'0.2rem',
                    width:20, height:20, borderRadius:'50%',
                    background:'linear-gradient(135deg,#b8860b,#f5c842)',
                    boxShadow:'0 0 0 5px #fff, 0 0 0 7px rgba(212,160,23,0.2)',
                    transform:'translateX(-9px)',
                    transition:'transform .3s, box-shadow .3s',
                    animation:`dotPulse ${3+i*0.5}s ease-in-out infinite ${i*0.7}s`,
                  }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateX(-9px) scale(1.6)';(e.currentTarget as HTMLElement).style.boxShadow='0 0 0 6px #fff, 0 0 0 9px rgba(212,160,23,0.35), 0 0 20px rgba(212,160,23,0.4)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='translateX(-9px) scale(1)';(e.currentTarget as HTMLElement).style.boxShadow='0 0 0 5px #fff, 0 0 0 7px rgba(212,160,23,0.2)';}}/>

                  <p style={{ fontFamily:'var(--font-playfair)', fontSize:'3rem', fontWeight:900, color:'rgba(10,22,40,0.05)', lineHeight:1, margin:'0 0 2px' }}>{h.year}</p>
                  <div style={{ padding:'1.25rem 1.5rem', borderRadius:16, background:'#f8fafc', border:'1px solid #e2e8f0', transition:'all .35s cubic-bezier(0.23,1,0.32,1)', cursor:'default' }}
                       onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='translateX(8px)';el.style.background='linear-gradient(135deg,rgba(212,160,23,0.06),rgba(212,160,23,0.02))';el.style.borderColor='rgba(212,160,23,0.3)';el.style.boxShadow='0 8px 24px rgba(10,22,40,0.08)';}}
                       onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='';el.style.background='#f8fafc';el.style.borderColor='#e2e8f0';el.style.boxShadow='';}}>
                    <p style={{ fontWeight:700, color:'#0a1628', fontSize:'1rem', margin:'0 0 4px' }}>{h.label}</p>
                    <p style={{ color:'#64748b', fontSize:'0.88rem', lineHeight:1.6, margin:0 }}>{h.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          VALORES — DARK + 3D CARDS
      ════════════════════════════════════════════════════════ */}
      <section style={{
        padding:'8rem 0',
        background:'linear-gradient(180deg,#050d1a 0%,#0a1628 40%,#0d1f3c 100%)',
        position:'relative', overflow:'hidden',
      }}>
        <FloatingOrb size={600} x={-10} y={-10} color="rgba(37,99,235,0.1)" dur={12} delay={0}/>
        <FloatingOrb size={450} x={70} y={60} color="rgba(212,160,23,0.08)" dur={9} delay={3}/>
        <FloatingOrb size={300} x={40} y={80} color="rgba(139,92,246,0.08)" dur={11} delay={1.5}/>
        <StarField count={20}/>

        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)', backgroundSize:'80px 80px', pointerEvents:'none' }}/>

        <div className="container" style={{ position:'relative', zIndex:2 }}>
          <div style={{ textAlign:'center', marginBottom:'5rem' }}>
            <div className="sn3-reveal" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0.4rem 1.5rem', borderRadius:9999, background:'rgba(212,160,23,0.1)', border:'1px solid rgba(212,160,23,0.25)', color:'#f5c842', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.22em', marginBottom:'1rem', animation:'pillFloat 4s ease-in-out infinite' }}>
              ✦ Lo que nos define
            </div>
            <h2 className="sn3-reveal stg-2" style={{ fontFamily:'var(--font-playfair)', color:'#fff', fontSize:'clamp(2.5rem,5vw,4rem)', lineHeight:1.0 }}>
              Nuestros{' '}
              <span style={{ background:'linear-gradient(135deg,#b8860b,#f5c842)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', fontStyle:'italic' }}>
                valores
              </span>
            </h2>
            <p className="sn3-reveal stg-3" style={{ color:'rgba(255,255,255,0.45)', fontSize:'1.05rem', maxWidth:480, margin:'1rem auto 0' }}>
              Los principios que guían cada evento, cada detalle, cada sonrisa.
            </p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1.25rem' }} className="sn3-vals-grid">
            {VALORES.map((v: any, i: number) => <ValorCard key={i} v={v} i={i}/>)}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          MISIÓN — DIAGONAL FLUIDA (SVG CURVE + FEATURES)
      ════════════════════════════════════════════════════════ */}
      <section className="sn3-mision-section" style={{
        padding:'8rem 0',
        background:'#f8fafc',
        position:'relative',
        overflow:'hidden',
        minHeight:'85vh',
        display:'flex',
        alignItems:'center'
      }}>
        <StarField count={8} light/>

        {/* Capa de Fondo: Capa con Curva S-Curve Orgánica y Fluida */}
        <div className="sn3-mision-bg" style={{ position:'absolute', top:0, right:0, width:'100%', height:'100%', zIndex:1, pointerEvents:'none' }}>
          <svg viewBox="0 0 1440 900" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <path
              d="M 820,0 C 690,260 880,590 540,900 L 1440,900 L 1440,0 Z"
              fill="#0a1628"
            />
          </svg>
          <FloatingOrb size={300} x={75} y={20} color="rgba(212,160,23,0.12)" dur={8} delay={0}/>
          <FloatingOrb size={200} x={85} y={60} color="rgba(146, 45, 45, 0.12)" dur={10} delay={2}/>
          <div style={{ position:'absolute', top:0, right:0, width:'40%', height:'100%' }}>
            <StarField count={12}/>
          </div>
        </div>

        {/* Contenido del Grid alineado proporcionalmente */}
        <div className="container" style={{ position:'relative', zIndex:2 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5rem', alignItems:'center' }}
               className="sn3-mission-grid">

            {/* Columna Izquierda: Mensaje Institucional */}
            <div>
              <p className="sn3-reveal" style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.25em', color:'#d4a017', marginBottom:12 }}>
                {misionSubtitle}
              </p>
              <h2 className="sn3-reveal stg-2" style={{ fontFamily:'var(--font-playfair)', fontSize:'clamp(2rem,4vw,3.25rem)', color:'#0a1628', lineHeight:1.1, marginBottom:'1.75rem' }}>
                {misionH2}
              </h2>
              <p className="sn3-reveal stg-3" style={{ color:'#475569', fontSize:'1.05rem', lineHeight:1.85, marginBottom:'1rem' }}>
                {misionP1}
              </p>
              <p className="sn3-reveal stg-4" style={{ color:'#475569', fontSize:'1.05rem', lineHeight:1.85, marginBottom:'2.5rem' }}>
                {misionP2}
              </p>
              <div className="sn3-reveal stg-5" style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
                <a href="/contacto" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0.875rem 2rem', borderRadius:9999, background:'linear-gradient(135deg,#0a1628,#1e3a5f)', color:'#fff', fontWeight:700, textDecoration:'none', boxShadow:'0 4px 16px rgba(10,22,40,0.25)', transition:'all .35s' }}
                   onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-3px)';(e.currentTarget as HTMLElement).style.boxShadow='0 12px 32px rgba(10,22,40,0.35)';}}
                   onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.boxShadow='0 4px 16px rgba(10,22,40,0.25)';}}>
                  Cotizar ahora →
                </a>
                <a href="https://wa.me/51945203708" target="_blank" rel="noopener noreferrer"
                   style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0.875rem 1.75rem', borderRadius:9999, background:'#25d366', color:'#fff', fontWeight:700, textDecoration:'none', transition:'all .35s' }}
                   onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-3px)'}
                   onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform=''}>
                  💬 WhatsApp
                </a>
              </div>
            </div>

            {/* Columna Derecha: Tarjetas sobre la Curva Oscura (Glassmorphism) */}
            <div className="sn3-mision-cards" style={{ display:'flex', flexDirection:'column', gap:'1rem', paddingLeft: '1.5rem' }}>
              {MISION_CARDS.map((card: any, i: number) => (
                <div key={i} className={`sn3-reveal stg-${i+2}`}
                     style={{ 
                       padding:'1.5rem 1.75rem', 
                       borderRadius:20, 
                       background:'rgba(255,255,255,0.03)', 
                       border:'1px solid rgba(255,255,255,0.08)', 
                       backdropFilter:'blur(12px)', 
                       WebkitBackdropFilter:'blur(12px)',
                       display:'flex', 
                       alignItems:'flex-start', 
                       gap:14, 
                       transition:'all .4s cubic-bezier(0.23,1,0.32,1)', 
                       cursor:'default', 
                       boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                       animation:`cardLevitate ${4.5+i*0.7}s ease-in-out infinite ${i*0.8}s` 
                     }}
                     onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='translateX(-8px)';el.style.background='rgba(255,255,255,0.07)';el.style.borderColor='rgba(212,160,23,0.3)';el.style.boxShadow='0 12px 32px rgba(0,0,0,0.4)';}}
                     onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='';el.style.background='rgba(255,255,255,0.03)';el.style.borderColor='rgba(255,255,255,0.08)';el.style.boxShadow='0 8px 32px 0 rgba(0, 0, 0, 0.2)';}}>
                  <div style={{ width:46, height:46, borderRadius:14, background:'rgba(212,160,23,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', flexShrink:0, border:'1px solid rgba(212,160,23,0.2)', animation:`iconSpin ${5+i*0.5}s ease-in-out infinite ${i*0.6}s` }}>{card.icon}</div>
                  <div>
                    <p style={{ color:'#ffffff', fontWeight:700, fontSize:'0.92rem', margin:'0 0 4px', fontFamily:'var(--font-playfair)' }}>{card.title}</p>
                    <p style={{ color:'rgba(255,255,255,0.65)', fontSize:'0.82rem', lineHeight:1.6, margin:0 }}>{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CTA FINAL
      ════════════════════════════════════════════════════════ */}
      <section style={{ padding:'8rem 0', background:'linear-gradient(135deg,#050d1a 0%,#0a1628 40%,#1e3a5f 100%)', position:'relative', overflow:'hidden' }}>
        <FloatingOrb size={600} x={60} y={-20} color="rgba(212,160,23,0.1)" dur={10} delay={0}/>
        <FloatingOrb size={400} x={-10} y={50} color="rgba(229, 237, 255, 0.32)" dur={12} delay={2}/>
        <StarField count={16}/>
        <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg,rgba(255,255,255,.015) 0,rgba(255,255,255,.015) 1px,transparent 1px,transparent 80px),repeating-linear-gradient(90deg,rgba(255,255,255,.015) 0,rgba(255,255,255,.015) 1px,transparent 1px,transparent 80px)', pointerEvents:'none' }}/>

        <div className="container" style={{ position:'relative', zIndex:2, textAlign:'center' }}>
          <div className="sn3-reveal">
            <p style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.25em', color:'#d4a017', marginBottom:'1.25rem', animation:'pillFloat 4s ease-in-out infinite' }}>
              {ctaBadge}
            </p>
            <h2 style={{ fontFamily:'var(--font-playfair)', fontSize:'clamp(2.5rem,5.5vw,5rem)', color:'#fff', lineHeight:1.0, marginBottom:'1.5rem' }}>
              {ctaH2}
            </h2>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'1.1rem', maxWidth:500, margin:'0 auto 3rem', lineHeight:1.8 }}>
              {ctaDesc}
            </p>
            <div style={{ display:'flex', gap:'1.25rem', justifyContent:'center', flexWrap:'wrap' }}>
              <a href={ctaBtn1Url} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'1rem 2.5rem', borderRadius:9999, background:'linear-gradient(135deg,#b8860b,#f5c842)', color:'#0a1628', fontWeight:700, textDecoration:'none', boxShadow:'0 4px 24px rgba(212,160,23,0.3)', transition:'all .35s' }}
                 onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='translateY(-4px)';el.style.boxShadow='0 12px 32px rgba(212,160,23,0.5)';}}
                 onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='';el.style.boxShadow='0 4px 24px rgba(212,160,23,0.3)';}}>
                {ctaBtn1}
              </a>
              <a href={ctaBtn2Url} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'1rem 2.5rem', borderRadius:9999, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', fontWeight:700, textDecoration:'none', transition:'all .35s' }}
                 onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='translateY(-4px)';el.style.background='rgba(255,255,255,0.1)';}}
                 onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='';el.style.background='rgba(255,255,255,0.06)';}}>
                {ctaBtn2}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ GLOBAL ANIMATIONS ══════════════════════════════════ */}
      <style>{`
        /* Reveal */
        .sn3-reveal{opacity:0;transform:translateY(28px);transition:opacity .8s ease,transform .8s cubic-bezier(0.23,1,0.32,1);}
        .sn3-reveal.sn3-vis{opacity:1;transform:none;}
        .stg-1{transition-delay:.05s}.stg-2{transition-delay:.12s}.stg-3{transition-delay:.19s}
        .stg-4{transition-delay:.26s}.stg-5{transition-delay:.33s}.stg-6{transition-delay:.40s}

        /* Float continuo para cards */
        @keyframes cardLevitate{
          0%,100%{transform:translateY(0px);}
          50%{transform:translateY(-10px);}
        }
        /* Ícono spin suave */
        @keyframes iconSpin{
          0%,100%{transform:translateY(0) rotate(0deg);}
          25%{transform:translateY(-5px) rotate(-6deg);}
          75%{transform:translateY(-3px) rotate(6deg);}
        }
        /* Pill flotante */
        @keyframes pillFloat{
          0%,100%{transform:translateY(0);}
          50%{transform:translateY(-5px);}
        }
        /* Texto shimmer */
        @keyframes textShimmer{from{background-position:0% center}to{background-position:200% center}}
        /* Orbitas */
        @keyframes orbDrift{0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(30px,-20px) scale(1.1);}66%{transform:translate(-20px,15px) scale(0.95);}
        }
        /* Anillos */
        @keyframes ringRot{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
        /* Stars */
        @keyframes starFloat{0%,100%{opacity:.15;transform:scale(1);}50%{opacity:.5;transform:scale(1.5);}}
        /* Dot pulse */
        @keyframes dotPulse{0%,100%{box-shadow:0 0 0 5px #fff,0 0 0 7px rgba(212,160,23,0.2);}50%{box-shadow:0 0 0 5px #fff,0 0 0 10px rgba(212,160,23,0.3),0 0 16px rgba(212,160,23,0.3);}}
        /* Line glow */
        @keyframes lineGlow{0%,100%{opacity:.8;}50%{opacity:1;box-shadow:0 0 8px rgba(212,160,23,0.6);}}
        /* Scroll */
        @keyframes scrollBob{0%{transform:translateY(0);opacity:1}80%{transform:translateY(14px);opacity:0}100%{transform:translateY(0);opacity:0}}

        /* Responsive */
        @media(max-width:1023px){
          .sn3-hero-grid,.sn3-hist-grid,.sn3-mission-grid{grid-template-columns:1fr!important;gap:2.5rem!important;}
          .sn3-vals-grid{grid-template-columns:1fr 1fr!important;}
          section div[style*="polygon"]{display:none!important;}
          /* Timeline: remove sticky on mobile */
          .sn3-hist-grid > div:first-child { position:static!important; }
          .sn3-timeline-section { padding:5rem 0!important; }
          /* Misión: hide diagonal SVG bg + orbs — use clean dark section on mobile */
          .sn3-mision-bg { display:none!important; }
          .sn3-mision-section {
            background: linear-gradient(160deg,#0a1628 0%,#0f2040 60%,#1a3a6b 100%)!important;
            min-height:unset!important;
            padding:4rem 0!important;
          }
          /* Left col text: switch to white on dark bg */
          .sn3-mission-grid > div:first-child p,
          .sn3-mission-grid > div:first-child h2 { color:#fff!important; }
          .sn3-mission-grid > div:first-child p:first-child { color:#d4a017!important; }
          .sn3-mission-grid > div:first-child p:not(:first-child) { color:rgba(255,255,255,0.72)!important; }
          /* Cards: lighter glass on dark */
          .sn3-mision-cards { padding-left:0!important; }
          .sn3-mision-cards > div {
            background:rgba(255,255,255,0.06)!important;
            border-color:rgba(255,255,255,0.12)!important;
            animation:none!important;
          }
        }
        @media(max-width:768px){
          /* Timeline mobile — cleaner card layout */
          .sn3-timeline-section { padding:4rem 0!important; }
          .sn3-hist-grid { gap:1.5rem!important; }
          /* Timeline left sticky heading: compact */
          .sn3-hist-grid > div:first-child { margin-bottom:0.5rem!important; }
          .sn3-hist-grid > div:first-child h2 { font-size:clamp(2rem,7vw,2.8rem)!important; margin-bottom:0.75rem!important; }
          .sn3-hist-grid > div:first-child p:last-child { display:none!important; }
          /* Timeline right column: tighten padding */
          .sn3-timeline-col { padding-left:2rem!important; }
        }
        @media(max-width:640px){
          .sn3-vals-grid{grid-template-columns:1fr!important;}
          .sn3-mission-grid > div:last-child { padding-left:0!important; }
          /* Timeline items: tighter spacing */
          .sn3-timeline-col > div { margin-bottom:1.5rem!important; }
          /* Misión CTAs: full width on small mobile */
          .sn3-mission-grid > div:first-child > div:last-child {
            flex-direction:column!important;
          }
          .sn3-mission-grid > div:first-child > div:last-child a {
            justify-content:center!important;
            text-align:center!important;
          }
        }
        @media(max-width:480px){
          .sn3-hero-grid > div:last-child { grid-template-columns:1fr 1fr!important; gap:0.75rem!important; }
          .sn3-cta-btns { flex-direction:column; align-items:stretch; }
          .sn3-cta-btns a { justify-content:center; text-align:center; }
          /* Timeline: ultra compact */
          .sn3-timeline-section { padding:3rem 0!important; }
          .sn3-timeline-col { padding-left:1.75rem!important; }
        }
      `}</style>
    </>
  );
}