'use client';
import { useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import VideoSoundControl from '@/components/ui/VideoSoundControl';
import { SERVICE_ICONS, isIconKey } from '@/lib/serviceIcons';

interface Service {
  id:string; title:string; icon:string; desc:string;
  link:string; mediaSrc?:string; mediaType?:string; mediaSound?:boolean; mediaFit?:string; order?:number;
}

const toSlug = (link:string) => link?.replace('servicios/','').replace('.html','') || '';

/* ── Colores de fondo por índice si no hay imagen (paleta de marca) ── */
const BG_COLORS = [
  'linear-gradient(135deg,#0a1628,#1e3a5f)',
  'linear-gradient(135deg,#050d1a,#0a1628)',
  'linear-gradient(135deg,#1e3a5f,#0a1628)',
  'linear-gradient(150deg,#0a1628 60%,#3d2f0a)',
  'linear-gradient(135deg,#0a1628,#123252)',
  'linear-gradient(150deg,#050d1a 55%,#1e3a5f)',
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
  // 'contain' evita recortar logos/diseños con texto pegado al borde en la
  // tarjeta 4:3 — por defecto 'cover' (mejor para fotos de eventos).
  const mediaFit: 'cover' | 'contain' = s.mediaFit === 'contain' ? 'contain' : 'cover';

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
        <div ref={containerRef} className="srv-card-container" style={{
          position:'relative', width:'100%', aspectRatio:'4/5', borderRadius:18,
          border:'1px solid rgba(212,160,23,0.16)',
          transition:'transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.3s ease',
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
                  <video key={s.mediaSrc} ref={vidRef} autoPlay muted loop playsInline
                         style={{ width:'100%', height:'100%', objectFit:mediaFit, display:'block' }}>
                    <source src={s.mediaSrc} type="video/mp4"/>
                  </video>
                  {s.mediaSound && (
                    <VideoSoundControl videoRef={vidRef} position="bottom-right" />
                  )}
                </>
              ) : (
                <Image src={s.mediaSrc} alt={s.title} fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                     style={{ objectFit:mediaFit, background: mediaFit === 'contain' ? bgColor : undefined }}/>
              )
            ) : (
              <div style={{ width:'100%', height:'100%', background:bgColor }}/>
            )}
            {/* Overlay para legibilidad — degradado inferior estilo premium */}
            <div style={{ position:'absolute', inset:0,
                           background:'linear-gradient(180deg,rgba(10,22,40,0) 30%,rgba(10,22,40,0.55) 65%,rgba(10,22,40,0.94) 100%)'
                         }}/>
          </div>

          {/* ── CAPA 2: Ícono + texto anclados abajo (flota con parallax) ── */}
          <div ref={layerFgRef} className="srv-card-fg" style={{
            position:'absolute', inset:0, zIndex:3,
            display:'flex', flexDirection:'column', alignItems:'flex-start',
            justifyContent:'flex-end', gap:8, padding:'1.5rem 1.4rem',
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
                ? (() => { const Icon = SERVICE_ICONS[s.icon]; return <Icon size={38} strokeWidth={1.75} color="#f5c842" />; })()
                : <span style={{ fontSize:'2.2rem' }}>{s.icon || '🎭'}</span>}
            </div>

            {/* Título */}
            <h3 style={{
              fontFamily:'var(--font-playfair)', fontWeight:700, fontSize:'1.35rem',
              color:'#fff', textAlign:'left', margin:0,
              textShadow:'0 2px 12px rgba(0,0,0,0.6)',
              transform:'translateZ(15px)',
            }}>
              {s.title}
            </h3>

            {/* Descripción */}
            <p style={{
              color:'rgba(255,255,255,0.72)', fontSize:'0.82rem',
              lineHeight:1.55, textAlign:'left', margin:0,
              textShadow:'0 1px 6px rgba(0,0,0,0.5)',
              transform:'translateZ(10px)',
            }}>
              {s.desc?.slice(0,90)}{(s.desc?.length||0)>90?'…':''}
            </p>

            {/* Enlace */}
            <span style={{
              display:'inline-flex', alignItems:'center', gap:6,
              color:'#f5c842', fontSize:'0.85rem', fontWeight:700,
              textShadow:'0 1px 6px rgba(0,0,0,0.5)',
              transform:'translateZ(25px)',
              marginTop:2,
            }}>
              Ver más →
            </span>
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
                         color:'#f5c842', fontSize:'0.75rem', fontWeight:700,
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

        {/* Grid 4 columnas — cards más compactas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1.5rem' }}
             className="srv-grid">
          {services.map((s, i) => (
            <div key={s.id} className={`reveal stagger-${Math.min(i+1,8)}`}>
              <AtvCard s={s} idx={i}/>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .srv-card-container.over {
          box-shadow: 0 45px 100px rgba(14,21,47,0.4), 0 16px 40px rgba(14,21,47,0.4);
          border-color: rgba(212,160,23,0.5) !important;
        }
        @media(max-width:1200px){ .srv-grid{ grid-template-columns:repeat(3,1fr) !important; } }
        @media(max-width:900px){ .srv-grid{ grid-template-columns:1fr 1fr !important; gap:1.25rem !important; } }
        @media(max-width:600px){
          .srv-grid{ grid-template-columns:1fr !important; gap:1rem !important; }
          .srv-card-container{ aspect-ratio:16/10 !important; }
          .srv-card-fg{ padding:1.1rem 1.2rem !important; gap:5px !important; }
          .srv-card-fg h3{ font-size:1.15rem !important; }
          .srv-card-fg p{ font-size:0.78rem !important; }
          .srv-card-fg > span{ font-size:0.8rem !important; }
          .srv-card-fg > div span{ font-size:1.8rem !important; }
        }
        @media(max-width:480px){
          .services-section{ padding:4rem 0 !important; }
        }
      `}</style>
    </section>
  );
}