'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import VideoSoundControl from '@/components/ui/VideoSoundControl';

interface AboutProps { data: Record<string,any>; }

export default function AboutSection({ data }: AboutProps) {
  const label     = data.label     || 'Quiénes Somos';
  const h2        = data.h2        || 'Tu Evento en Manos de Expertos Creativos';
  const p1        = data.p1        || 'Somos una empresa <strong>apasionada por crear experiencias únicas e inolvidables</strong>.';
  const p2        = data.p2        || 'Creamos ambientes memorables con detalles únicos que sorprenden a tus invitados.';
  const p3        = data.p3        || '';
  const img1      = data.img1      || '';
  const img1Pos   = data.img1Pos   || 'center 30%';
  const img1Type  = data.img1Type  || 'image';
  const img1Sound = !!data.img1Sound;
  const img2      = data.img2      || '';
  const img2Pos   = data.img2Pos   || 'center center';
  const img2Type  = data.img2Type  || 'image';
  const img2Sound = !!data.img2Sound;
  const badgeNum  = data.badgeNum  || '+10';
  const badgeTxt  = data.badgeTxt  || 'Años de<br/>Experiencia';

  const [revealed, setRevealed]   = useState(false);
  const [imgHover1, setImgHover1] = useState(false);
  const [imgHover2, setImgHover2] = useState(false);
  const [mousePos, setMousePos]   = useState({ x:0, y:0 });
  const sectionRef = useRef<HTMLElement>(null);
  const vid1Ref    = useRef<HTMLVideoElement>(null);
  const vid2Ref    = useRef<HTMLVideoElement>(null);
  const cardRef    = useRef<HTMLDivElement>(null);

  // Reveal on scroll
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setRevealed(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  // Parallax tilt en el bloque de imágenes
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width  - 0.5) * 12;
    const y = ((e.clientY - r.top)  / r.height - 0.5) * -12;
    setMousePos({ x, y });
  };
  const onMouseLeave = () => setMousePos({ x:0, y:0 });

  const STATS = [
    { n:'+500', l:'Eventos',      icon:'🎉' },
    { n:'+10',  l:'Años',         icon:'⭐' },
    { n:'100%', l:'Satisfacción', icon:'💎' },
  ];

  const FEATURES = [
    { icon:'🎭', text:'Shows & Entretenimiento' },
    { icon:'🎨', text:'Decoración Temática' },
    { icon:'📸', text:'Fotografía Profesional' },
    { icon:'🍽️', text:'Catering & Snacks' },
  ];

  return (
    <section ref={sectionRef} id="nosotros"
      style={{ padding:'7rem 0', background:'#fff', position:'relative', overflow:'hidden' }}
      className="about-section">

      {/* ── Fondo atmosférico ── */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        {/* Blob dorado */}
        <div style={{ position:'absolute', top:'-10%', right:'-5%', width:500, height:500,
                       borderRadius:'50%', filter:'blur(80px)',
                       background:'radial-gradient(circle,rgba(212,160,23,0.08) 0%,transparent 70%)',
                       animation:'blobDrift 8s ease-in-out infinite' }}/>
        {/* Blob azul */}
        <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:400, height:400,
                       borderRadius:'50%', filter:'blur(70px)',
                       background:'radial-gradient(circle,rgba(30,58,95,0.07) 0%,transparent 70%)',
                       animation:'blobDrift 10s ease-in-out infinite reverse' }}/>
        {/* Grid sutil */}
        <div style={{ position:'absolute', inset:0, opacity:.025,
                       backgroundImage:'linear-gradient(rgba(10,22,40,1) 1px,transparent 1px),linear-gradient(90deg,rgba(10,22,40,1) 1px,transparent 1px)',
                       backgroundSize:'60px 60px' }}/>
        {/* Partículas */}
        {[...Array(8)].map((_,i) => (
          <div key={i} style={{
            position:'absolute',
            left:`${(i*13+7)%88}%`, top:`${(i*17+11)%82}%`,
            width:3+(i%3)*2, height:3+(i%3)*2, borderRadius:'50%',
            background: i%2===0 ? 'rgba(212,160,23,0.25)' : 'rgba(37,99,235,0.2)',
            animation:`particleDrift ${4+i}s ease-in-out infinite ${i*0.6}s`,
          }}/>
        ))}
      </div>

      <div className="container" style={{ position:'relative', zIndex:2 }}>
        <div style={{
          display:'grid', gridTemplateColumns:'1fr 1fr',
          gap:'5rem', alignItems:'center',
        }} className="about-premium-grid">

          {/* ══ COLUMNA IZQUIERDA — Imágenes con tilt 3D ══ */}
          <div
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            className="about-img-col"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translateX(0)' : 'translateX(-50px)',
              transition: 'opacity .9s ease, transform .9s ease',
              position:'relative',
            }}
          >
            {/* Contenedor con perspectiva 3D */}
            <div ref={cardRef} style={{
              transform: `perspective(1000px) rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg)`,
              transition: 'transform 0.3s ease-out',
              transformStyle: 'preserve-3d',
              position:'relative',
            }}>

              {/* Imagen principal */}
              <div
                onMouseEnter={() => setImgHover1(true)}
                onMouseLeave={() => setImgHover1(false)}
                style={{
                  borderRadius: 24, overflow:'hidden',
                  aspectRatio: '3/4',
                  boxShadow: imgHover1
                    ? '0 40px 80px rgba(10,22,40,0.3), 0 0 0 3px rgba(212,160,23,0.4)'
                    : '0 24px 60px rgba(10,22,40,0.18)',
                  transform: imgHover1 ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all .4s cubic-bezier(0.23,1,0.32,1)',
                  cursor: 'pointer',
                  position:'relative',
                  border: '3px solid rgba(255,255,255,0.8)',
                }}
              >
                {img1 ? (
                  img1Type === 'video'
                    ? <>
                        <video key={img1} ref={vid1Ref} autoPlay muted loop playsInline src={img1}
                               style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                        {img1Sound && <VideoSoundControl videoRef={vid1Ref} position="bottom-left"/>}
                      </>
                    : <Image src={img1} alt={h2.replace(/<[^>]*>/g, '') || 'J&M Decoraciones y Eventos'} fill sizes="(max-width: 1023px) 90vw, 45vw"
                           style={{ objectFit:'cover', objectPosition:img1Pos,
                                     transition:'transform .6s ease',
                                     transform: imgHover1 ? 'scale(1.06)' : 'scale(1)' }}/>
                ) : (
                  <div style={{ width:'100%', height:'100%',
                                 background:'linear-gradient(135deg,#0a1628,#1e3a5f)',
                                 display:'flex', alignItems:'center', justifyContent:'center', fontSize:'5rem' }}>
                    🎪
                  </div>
                )}
                {/* Shimmer overlay */}
                {imgHover1 && (
                  <div style={{ position:'absolute', inset:0, borderRadius:24,
                                 background:'linear-gradient(135deg,rgba(255,255,255,0.08) 0%,transparent 50%)',
                                 pointerEvents:'none' }}/>
                )}
                {/* Etiqueta flotante sobre imagen */}
                <div style={{
                  position:'absolute', top:16, left:16,
                  background:'rgba(10,22,40,0.75)', backdropFilter:'blur(8px)',
                  borderRadius:12, padding:'6px 14px',
                  border:'1px solid rgba(212,160,23,0.3)',
                  animation:'tagFloat 3.5s ease-in-out infinite',
                }}>
                  <p style={{ color:'#f5c842', fontSize:'0.75rem', fontWeight:700, margin:0,
                               textTransform:'uppercase', letterSpacing:'.1em' }}>
                    ✦ {label}
                  </p>
                </div>
              </div>

              {/* Imagen secundaria superpuesta */}
              {img2 && (
                <div
                  onMouseEnter={() => setImgHover2(true)}
                  onMouseLeave={() => setImgHover2(false)}
                  className="about-img2"
                  style={{
                    position:'absolute', bottom:'10%', right:'-12%',
                    width:'52%', aspectRatio:'4/3',
                    borderRadius:18, overflow:'hidden',
                    border:'4px solid #fff',
                    boxShadow: imgHover2
                      ? '0 20px 50px rgba(10,22,40,0.4), 0 0 0 2px rgba(212,160,23,0.4)'
                      : '0 12px 32px rgba(10,22,40,0.22)',
                    transform: imgHover2 ? 'scale(1.06) translateY(-4px)' : 'scale(1)',
                    transition:'all .4s cubic-bezier(0.23,1,0.32,1)',
                    cursor:'pointer',
                    animation:'img2Float 5s ease-in-out infinite',
                    zIndex:3,
                  }}
                >
                  {img2Type === 'video'
                    ? <>
                        <video key={img2} ref={vid2Ref} autoPlay muted loop playsInline src={img2}
                               style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                        {img2Sound && <VideoSoundControl videoRef={vid2Ref} position="bottom-right"/>}
                      </>
                    : <Image src={img2} alt="Evento organizado por J&M Decoraciones y Eventos" fill sizes="(max-width: 640px) 44vw, (max-width: 1023px) 40vw, 24vw"
                           style={{ objectFit:'cover', objectPosition:img2Pos }}/>
                  }
                  {imgHover2 && (
                    <div style={{ position:'absolute', inset:0, background:'rgba(212,160,23,0.1)', pointerEvents:'none' }}/>
                  )}
                </div>
              )}

              {/* Badge años — flota */}
              <div className="about-badge" style={{
                position:'absolute', bottom:'5%', left:'-8%',
                background:'linear-gradient(135deg,#b8860b,#f5c842)',
                borderRadius:20, padding:'1.25rem 1.5rem', textAlign:'center',
                boxShadow:'0 16px 40px rgba(212,160,23,0.55)',
                border:'3px solid rgba(255,255,255,0.7)',
                animation:'badgeFloat 4s ease-in-out infinite',
                zIndex:4,
                cursor:'default',
              }}>
                <p style={{ fontFamily:'var(--font-playfair)', fontSize:'2.5rem', fontWeight:900,
                             color:'#0a1628', margin:0, lineHeight:1 }}>
                  {badgeNum}
                </p>
                <p style={{ fontSize:'0.75rem', fontWeight:800, color:'rgba(10,22,40,0.8)', margin:'4px 0 0',
                             textTransform:'uppercase', letterSpacing:'.08em', lineHeight:1.3 }}
                   dangerouslySetInnerHTML={{ __html: badgeTxt }}/>
              </div>

              {/* Partícula decorativa */}
              <div className="about-deco-dot" style={{
                position:'absolute', top:'15%', right:'-6%',
                width:14, height:14, borderRadius:'50%',
                background:'linear-gradient(135deg,#b8860b,#f5c842)',
                boxShadow:'0 4px 12px rgba(212,160,23,0.5)',
                animation:'dotFloat 3s ease-in-out infinite .5s',
              }}/>
              <div className="about-deco-dot" style={{
                position:'absolute', top:'35%', right:'-10%',
                width:8, height:8, borderRadius:'50%',
                background:'rgba(30,58,95,0.4)',
                animation:'dotFloat 4s ease-in-out infinite 1s',
              }}/>
            </div>
          </div>

          {/* ══ COLUMNA DERECHA — Texto premium ══ */}
          <div style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateX(0)' : 'translateX(50px)',
            transition: 'opacity .9s ease .2s, transform .9s ease .2s',
          }}>
            {/* Eyebrow animado */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8, marginBottom:'1.25rem',
              padding:'0.4rem 1.25rem', borderRadius:9999,
              background:'rgba(30,58,95,0.07)', border:'1px solid rgba(30,58,95,0.15)',
              color:'#1e3a5f', fontSize:'0.75rem', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'.18em',
              animation: revealed ? 'slideInRight .6s ease .4s both' : 'none',
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#d4a017',
                               animation:'blink 2s ease-in-out infinite' }}/>
              {label}
            </div>

            {/* Headline con gradiente en palabra clave */}
            <h2 style={{
              fontFamily:'var(--font-playfair)', fontWeight:700,
              fontSize:'clamp(1.9rem,3.5vw,2.9rem)',
              color:'#0a1628', lineHeight:1.1, marginBottom:'1.5rem',
              animation: revealed ? 'slideInRight .6s ease .5s both' : 'none',
            }}>
              {h2.split(' ').map((word:string, i:number) => {
                const highlight = ['Expertos','Creativos','Únicos','Memorables','Perfectas','Mágicos','Manos'].includes(word.replace(/[,\.]/g,''));
                return (
                  <span key={i} style={{
                    display:'inline-block', marginRight:'0.25em',
                    color: highlight ? 'transparent' : '#0a1628',
                    background: highlight ? 'linear-gradient(135deg,#b8860b,#f5c842)' : 'none',
                    WebkitBackgroundClip: highlight ? 'text' : 'unset',
                    backgroundClip: highlight ? 'text' : 'unset',
                  }}>
                    {word}
                  </span>
                );
              })}
            </h2>

            {/* Línea decorativa animada */}
            <div style={{
              height:3, marginBottom:'1.75rem',
              background:'linear-gradient(90deg,#b8860b,#f5c842,transparent)',
              borderRadius:99,
              animation: revealed ? 'lineExpand .8s ease .6s both' : 'none',
              transformOrigin:'left',
            }}/>

            {/* Textos */}
            {[p1, p2].filter(Boolean).map((p:string, i:number) => (
              <p key={i}
                 style={{ color:'#475569', fontSize:'1.03rem', lineHeight:1.85,
                           marginBottom:'1rem', fontFamily:'var(--font-jakarta)',
                           animation: revealed ? `slideInRight .6s ease ${.7+i*.1}s both` : 'none' }}
                 dangerouslySetInnerHTML={{ __html: p }}/>
            ))}

            {/* p3 */}
            {p3 && (
              <p className="about-p3"
                 style={{ color:'#475569', fontSize:'1.03rem', lineHeight:1.85,
                           marginBottom:'1rem', fontFamily:'var(--font-jakarta)',
                           animation: revealed ? 'slideInRight .6s ease .8s both' : 'none' }}
                 dangerouslySetInnerHTML={{ __html: p3 }}/>
            )}

            {/* Features chips */}
            <div className="about-features-wrap" style={{
              display:'flex', flexWrap:'wrap', gap:8, margin:'1.5rem 0',
              animation: revealed ? 'slideInRight .6s ease .9s both' : 'none',
            }}>
              {FEATURES.map(({ icon, text }, idx) => (
                <div key={text} className="about-feature-chip"
                     style={{
                       display:'inline-flex', alignItems:'center', gap:6,
                       padding:'6px 14px', borderRadius:9999,
                       background:'rgba(30,58,95,0.06)', border:'1px solid rgba(30,58,95,0.12)',
                       color:'#334155', fontSize:'0.78rem', fontWeight:600,
                       transition:'all .25s', cursor:'default',
                     }}
                     onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background='rgba(212,160,23,0.1)';el.style.borderColor='rgba(212,160,23,0.35)';el.style.transform='translateY(-2px)';}}
                     onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background='rgba(30,58,95,0.06)';el.style.borderColor='rgba(30,58,95,0.12)';el.style.transform='';}}>
                  <span className="about-feature-icon">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Stats strip */}
            <div className="about-stats-strip" style={{
              display:'flex', gap:'2rem',
              padding:'1.25rem 1.5rem', borderRadius:16, marginBottom:'2rem',
              background:'linear-gradient(135deg,rgba(10,22,40,0.04),rgba(30,58,95,0.06))',
              border:'1px solid rgba(10,22,40,0.08)',
              animation: revealed ? 'slideInRight .6s ease 1s both' : 'none',
            }}>
              {STATS.map(({ n, l, icon }) => (
                <div key={l} className="about-stat-item" style={{ textAlign:'center', flex:1 }}>
                  <div className="about-stat-icon" style={{ fontSize:'1.25rem', marginBottom:4 }}>{icon}</div>
                  <p style={{ fontFamily:'var(--font-playfair)', fontSize:'1.6rem', fontWeight:700,
                               color:'#d4a017', margin:'0 0 2px', lineHeight:1 }}>{n}</p>
                  <p style={{ color:'#94a3b8', fontSize:'0.75rem', margin:0,
                               textTransform:'uppercase', letterSpacing:'.08em' }}>{l}</p>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="about-ctas" style={{
              display:'flex', gap:'1rem', flexWrap:'wrap',
              animation: revealed ? 'slideInRight .6s ease 1.1s both' : 'none',
            }}>
              <a href="/contacto" className="about-cta-primary" style={{
                display:'inline-flex', alignItems:'center', gap:8,
                padding:'0.9rem 2rem', borderRadius:9999,
                background:'linear-gradient(135deg,#0a1628,#1e3a5f)',
                color:'#fff', fontWeight:700, fontSize:'0.9rem', textDecoration:'none',
                boxShadow:'0 4px 20px rgba(10,22,40,0.25)',
                transition:'all .35s cubic-bezier(0.23,1,0.32,1)',
              }}
              onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='translateY(-3px)';el.style.boxShadow='0 12px 32px rgba(10,22,40,0.35)';}}
              onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='';el.style.boxShadow='0 4px 20px rgba(10,22,40,0.25)';}}>
                ✨ Cotizar Ahora
              </a>
              <a href="https://wa.me/51945203708?text=Hola!%20Quiero%20saber%20m%C3%A1s"
                 target="_blank" rel="noopener noreferrer"
                 className="about-cta-wa"
                 style={{
                   display:'none', alignItems:'center', gap:8,
                   padding:'0.9rem 2rem', borderRadius:9999,
                   background:'#25d366', color:'#fff',
                   fontWeight:700, fontSize:'0.9rem', textDecoration:'none',
                   boxShadow:'0 4px 20px rgba(37,211,102,0.3)',
                   transition:'all .35s cubic-bezier(0.23,1,0.32,1)',
                 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Contáctanos
              </a>
              <a href="/sobre-nosotros" className="about-cta-secondary" style={{
                display:'inline-flex', alignItems:'center', gap:8,
                padding:'0.9rem 1.75rem', borderRadius:9999,
                border:'2px solid rgba(30,58,95,0.2)', color:'#1e3a5f',
                fontWeight:700, fontSize:'0.9rem', textDecoration:'none',
                transition:'all .35s cubic-bezier(0.23,1,0.32,1)',
              }}
              onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background='rgba(30,58,95,0.05)';el.style.transform='translateY(-2px)';el.style.borderColor='rgba(30,58,95,0.4)';}}
              onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background='transparent';el.style.transform='';el.style.borderColor='rgba(30,58,95,0.2)';}}>
                Nuestra Historia →
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blobDrift {
          0%,100%{ transform:translate(0,0) scale(1); }
          33%    { transform:translate(20px,-15px) scale(1.05); }
          66%    { transform:translate(-15px,10px) scale(0.98); }
        }
        @keyframes particleDrift {
          0%,100%{ transform:translateY(0) translateX(0); opacity:.5; }
          50%    { transform:translateY(-18px) translateX(8px); opacity:1; }
        }
        @keyframes tagFloat {
          0%,100%{ transform:translateY(0); }
          50%    { transform:translateY(-6px); }
        }
        @keyframes img2Float {
          0%,100%{ transform:scale(1) translateY(0); }
          50%    { transform:scale(1) translateY(-8px); }
        }
        @keyframes badgeFloat {
          0%,100%{ transform:translateY(0) rotate(0deg); }
          50%    { transform:translateY(-10px) rotate(1deg); }
        }
        @keyframes dotFloat {
          0%,100%{ transform:translateY(0); }
          50%    { transform:translateY(-10px); }
        }
        @keyframes blink {
          0%,100%{ opacity:1; } 50%{ opacity:0.3; }
        }
        @keyframes slideInRight {
          from{ opacity:0; transform:translateX(20px); }
          to  { opacity:1; transform:translateX(0); }
        }
        @keyframes lineExpand {
          from{ transform:scaleX(0); opacity:0; }
          to  { transform:scaleX(1); opacity:1; }
        }
        @keyframes featureIn {
          from{ opacity:0; transform:translateY(12px); }
          to  { opacity:1; transform:translateY(0); }
        }

        /* ── DESKTOP: sin cambios ── */

        /* ── MOBILE: todos los cambios visuales ── */
        @media(max-width:1023px){
          .about-premium-grid{ grid-template-columns:1fr !important; gap:3rem !important; }
          .about-img-col{ overflow:hidden; padding-bottom:3rem; }
          .about-img2{ right:2% !important; width:44% !important; }
          .about-badge{ left:0 !important; bottom:-2% !important; }
          .about-deco-dot{ display:none !important; }
          /* Hide atmospheric background decorations completely on mobile */
          .about-section > div:first-child { display:none !important; }
        }

        @media(max-width:768px){
          /* Fondo warm cream */
          #nosotros { background: #faf9f6 !important; }

          /* Features: pill → dark grid cards */
          .about-features-wrap {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 0.55rem !important;
            flex-wrap: unset !important;
          }
          .about-feature-chip {
            background: #0a1628 !important;
            border: 1px solid rgba(212,160,23,0.18) !important;
            color: rgba(255,255,255,0.9) !important;
            border-radius: 14px !important;
            padding: 0.7rem 0.875rem !important;
            gap: 10px !important;
            font-size: 0.79rem !important;
          }
          .about-feature-icon {
            width: 32px; height: 32px;
            background: rgba(212,160,23,0.12);
            border-radius: 9px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.05rem; flex-shrink: 0;
          }

          /* Stats: strip → 3 tarjetas con borde dorado */
          .about-stats-strip {
            gap: 0.55rem !important;
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
          }
          .about-stat-item {
            background: linear-gradient(135deg,rgba(212,160,23,0.09),rgba(184,134,11,0.04)) !important;
            border: 1px solid rgba(212,160,23,0.25) !important;
            border-radius: 14px !important;
            padding: 0.9rem 0.5rem !important;
          }
          .about-stat-icon { font-size: 1.4rem !important; }

          /* p3: plain → box con borde dorado */
          .about-p3 {
            background: linear-gradient(135deg,rgba(10,22,40,0.04),rgba(10,22,40,0.02)) !important;
            border: 1px solid rgba(10,22,40,0.09) !important;
            border-left: 3px solid #d4a017 !important;
            border-radius: 0 12px 12px 0 !important;
            padding: 0.875rem 1.1rem !important;
            font-style: italic !important;
            font-size: 0.92rem !important;
            color: #334155 !important;
            margin-bottom: 1.25rem !important;
          }

          /* CTAs: mostrar WhatsApp, ocultar "Historia", full-width en mobile */
          .about-ctas { flex-direction: column !important; gap: 0.65rem !important; }
          .about-cta-primary {
            order: 2 !important;
            justify-content: center !important;
            background: #0a1628 !important;
            color: #f5c842 !important;
            border: 1px solid rgba(212,160,23,0.35) !important;
            box-shadow: none !important;
          }
          .about-cta-wa {
            display: inline-flex !important;
            order: 1 !important;
            justify-content: center !important;
          }
          .about-cta-secondary { display: none !important; }
        }

        @media(max-width:640px){
          .about-img2{ display:none !important; }
          .about-badge{ left:1rem !important; padding:0.875rem 1.1rem !important; }
          .about-badge p:first-child{ font-size:1.75rem !important; }
          .about-img-col{ padding-bottom:2rem; }
        }
        @media(max-width:380px){
          .about-features-wrap { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}