'use client';
import { useRef, useCallback } from 'react';
import Link from 'next/link';
import VideoSoundControl from '@/components/ui/VideoSoundControl';
import { SERVICE_ICONS, isIconKey } from '@/lib/serviceIcons';

interface Service {
  id:string; title:string; icon:string; desc:string;
  link:string; mediaSrc?:string; mediaType?:string; mediaSound?:boolean; order?:number;
}

const toSlug = (link:string) => link?.replace('servicios/','').replace('.html','') || '';

/* ── Colores de fondo por índice si no hay imagen ── */
const BG_COLORS = [
  'linear-gradient(135deg,#0a1628,#1e3a5f)',
  'linear-gradient(135deg,#1e1b4b,#4338ca)',
  'linear-gradient(135deg,#14532d,#16a34a)',
  'linear-gradient(135deg,#7c2d12,#ea580c)',
  'linear-gradient(135deg,#4a044e,#a21caf)',
  'linear-gradient(135deg,#0c4a6e,#0284c7)',
];

function AtvCard({ s, idx }: { s: Service; idx: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerBgRef   = useRef<HTMLDivElement>(null);
  const layerFgRef   = useRef<HTMLDivElement>(null);
  const shineRef     = useRef<HTMLDivElement>(null);
  const vidRef       = useRef<HTMLVideoElement>(null);
  const isOver       = useRef(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const elem = e.currentTarget;
    const container = containerRef.current;
    const shine     = shineRef.current;
    const layerBg   = layerBgRef.current;
    const layerFg   = layerFgRef.current;
    if (!container || !shine || !layerBg || !layerFg) return;

    const rect = elem.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const offsetX = 0.52 - (e.clientX - rect.left) / w;
    const offsetY = 0.52 - (e.clientY - rect.top)  / h;
    const dy = (e.clientY - rect.top)  - h / 2;
    const dx = (e.clientX - rect.left) - w / 2;
    const wMultiple = 320 / w;
    const yRotate = (offsetX - dx) * (0.07 * wMultiple);
    const xRotate = (dy - offsetY) * (0.1  * wMultiple);
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI - 90 + 360) % 360;
    const opShine = (e.clientY - rect.top) / h * 0.4;

    let css = `rotateX(${xRotate}deg) rotateY(${yRotate}deg)`;
    if (isOver.current) css += ' scale3d(1.06,1.06,1.06)';
    container.style.transform = css;

    shine.style.background = `linear-gradient(${angle}deg, rgba(255,255,255,${opShine}) 0%, rgba(255,255,255,0) 80%)`;
    shine.style.transform   = `translateX(${offsetX * 2 - 0.1}px) translateY(${offsetY * 2 - 0.1}px)`;

    // Capa bg — se mueve poco
    layerBg.style.transform = `translateX(${offsetX * 2 * (2.5 / wMultiple)}px) translateY(${offsetY * 2 * (2.5 / wMultiple)}px)`;
    // Capa fg (emoji + texto) — se mueve más (parallax)
    layerFg.style.transform = `translateX(${offsetX * 1 * (5 / wMultiple)}px) translateY(${offsetY * 2 * (5 / wMultiple)}px)`;
  }, []);

  const onEnter = useCallback(() => {
    isOver.current = true;
    if (containerRef.current) containerRef.current.classList.add('over');
  }, []);

  const onLeave = useCallback(() => {
    isOver.current = false;
    const c = containerRef.current, s = shineRef.current,
          bg = layerBgRef.current, fg = layerFgRef.current;
    if (c)  { c.style.transform = ''; c.classList.remove('over'); }
    if (s)  { s.style.cssText = ''; }
    if (bg) bg.style.transform = '';
    if (fg) fg.style.transform = '';
  }, []);

  const isVideo  = s.mediaType === 'video' || !!s.mediaSrc?.match(/\.(mp4|webm|mov)/i);
  const bgColor  = BG_COLORS[idx % BG_COLORS.length];

  return (
    <Link href={`/servicios/${toSlug(s.link)}`} style={{ textDecoration:'none', display:'block' }}>
      <div
        onMouseMove={onMove}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        style={{
          borderRadius: 16, transformStyle:'preserve-3d',
          perspective: '900px',
          WebkitTapHighlightColor: 'rgba(0,0,0,0)',
          cursor: 'pointer',
        }}
      >
        {/* Shadow */}
        <div style={{
          position:'absolute', top:'5%', left:'5%', width:'90%', height:'90%',
          transition:'box-shadow 0.2s ease-out',
          boxShadow:'0 8px 30px rgba(14,21,47,0.5)',
          borderRadius: 16, zIndex: 0, pointerEvents:'none',
        }}/>

        {/* Container — el que rota */}
        <div ref={containerRef} style={{
          position:'relative', width:'100%', height:220, borderRadius:16,
          transition:'transform 0.2s ease-out, box-shadow 0.2s ease-out',
          transformStyle:'preserve-3d', overflow:'hidden',
        }}>

          {/* ── CAPA 1: Fondo — video o imagen o color ── */}
          <div ref={layerBgRef} style={{
            position:'absolute', inset:0, borderRadius:16,
            transition:'transform 0.1s ease-out',
            overflow:'hidden', zIndex:1,
          }}>
            {s.mediaSrc ? (
              isVideo ? (
                <>
                  <video ref={vidRef} autoPlay muted loop playsInline
                         style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}>
                    <source src={s.mediaSrc} type="video/mp4"/>
                  </video>
                  {s.mediaSound && (
                    <VideoSoundControl videoRef={vidRef} position="bottom-right" />
                  )}
                </>
              ) : (
                <img src={s.mediaSrc} alt={s.title} loading="lazy" decoding="async"
                     style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
              )
            ) : (
              <div style={{ width:'100%', height:'100%', background:bgColor }}/>
            )}
            {/* Overlay para legibilidad */}
            <div style={{ position:'absolute', inset:0,
                           background:'linear-gradient(to top,rgba(5,13,26,0.75) 0%,rgba(5,13,26,0.25) 60%,transparent 100%)'
                         }}/>
          </div>

          {/* ── CAPA 2: Emoji + texto (flota encima con más parallax) ── */}
          <div ref={layerFgRef} style={{
            position:'absolute', inset:0, zIndex:3,
            display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', gap:10,
            transition:'transform 0.1s ease-out',
            transformStyle:'preserve-3d',
          }}>
            {/* Ícono (SVG dorado si es una clave del picker, emoji si es texto libre) con "profundidad" */}
            <div style={{
              lineHeight:1,
              filter:'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
              transform:'translateZ(20px)',
            }}>
              {isIconKey(s.icon)
                ? (() => { const Icon = SERVICE_ICONS[s.icon]; return <Icon size={44} strokeWidth={1.75} color="#f5c842" />; })()
                : <span style={{ fontSize:'2.75rem' }}>{s.icon || '🎭'}</span>}
            </div>

            {/* Título */}
            <h3 style={{
              fontFamily:'var(--font-playfair)', fontWeight:700, fontSize:'1rem',
              color:'#fff', textAlign:'center', margin:0, padding:'0 1rem',
              textShadow:'0 2px 12px rgba(0,0,0,0.6)',
              transform:'translateZ(15px)',
            }}>
              {s.title}
            </h3>

            {/* Descripción */}
            <p style={{
              color:'rgba(255,255,255,0.72)', fontSize:'0.78rem',
              lineHeight:1.55, textAlign:'center', margin:0, padding:'0 1.25rem',
              textShadow:'0 1px 6px rgba(0,0,0,0.5)',
              transform:'translateZ(10px)',
            }}>
              {s.desc?.slice(0,70)}{(s.desc?.length||0)>70?'…':''}
            </p>

            {/* Botón */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'5px 14px', borderRadius:9999,
              background:'linear-gradient(135deg,#b8860b,#f5c842)',
              color:'#0a1628', fontSize:'0.72rem', fontWeight:700,
              boxShadow:'0 4px 12px rgba(212,160,23,0.45)',
              transform:'translateZ(25px)',
              marginTop:4,
            }}>
              Ver más →
            </div>
          </div>

          {/* ── CAPA 3: Shine ── */}
          <div ref={shineRef} style={{
            position:'absolute', inset:0, zIndex:4, borderRadius:16,
            background:'linear-gradient(135deg,rgba(255,255,255,0.18) 0%,rgba(255,255,255,0) 60%)',
            pointerEvents:'none',
          }}/>
        </div>
      </div>
    </Link>
  );
}

export default function ServicesSection({ services }: { services: Service[] }) {
  if (!services?.length) return null;

  return (
    <section id="servicios" className="services-section" style={{ padding:'6rem 0', background:'#0a1628', position:'relative', overflow:'hidden' }}>
      {/* Fondo decorativo */}
      <div style={{ position:'absolute', top:-200, right:-200, width:600, height:600, borderRadius:'50%',
                     background:'radial-gradient(circle,rgba(212,160,23,0.06) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:-150, left:-150, width:500, height:500, borderRadius:'50%',
                     background:'radial-gradient(circle,rgba(37,99,235,0.06) 0%,transparent 70%)', pointerEvents:'none' }}/>

      <div className="container">
        {/* Header */}
        <div className="reveal" style={{ textAlign:'center', marginBottom:'4rem' }}>
          <div className="float-y-tiny"
               style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:'1rem',
                         padding:'0.4rem 1.5rem', borderRadius:9999,
                         background:'rgba(212,160,23,0.08)', border:'1px solid rgba(212,160,23,0.25)',
                         color:'#f5c842', fontSize:'0.72rem', fontWeight:700,
                         textTransform:'uppercase', letterSpacing:'.12em' }}>
            🎭 Nuestros Servicios
          </div>
          <h2 style={{ color:'#fff', marginBottom:'1rem', fontSize:'clamp(2rem,4vw,3rem)' }}>
            Todo lo que necesitas para tu{' '}
            <em style={{ color:'#d4a017', fontStyle:'italic' }}>evento perfecto</em>
          </h2>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'1.05rem', maxWidth:540, margin:'0 auto' }}>
            Desde la decoración hasta el entretenimiento — lo organizamos todo.
          </p>
        </div>

        {/* Grid 3 columnas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'2rem' }}
             className="srv-grid">
          {services.map((s, i) => (
            <div key={s.id} className={`reveal stagger-${Math.min(i+1,8)}`}>
              <AtvCard s={s} idx={i}/>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .atvImg-container.over {
          box-shadow: 0 45px 100px rgba(14,21,47,0.4), 0 16px 40px rgba(14,21,47,0.4);
        }
        @media(max-width:900px){ .srv-grid{ grid-template-columns:1fr 1fr !important; gap:1.25rem !important; } }
        @media(max-width:600px){ .srv-grid{ grid-template-columns:1fr !important; } }
        @media(max-width:480px){
          .services-section{ padding:4rem 0 !important; }
        }
      `}</style>
    </section>
  );
}