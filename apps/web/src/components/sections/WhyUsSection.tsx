'use client';
import { useRef, useState } from 'react';

const DEFAULT_ITEMS = [
  { icon:'🏆', title:'Experiencia Comprobada',  desc:'Más de 10 años organizando eventos exitosos en Sechura y toda la región Piura.' },
  { icon:'🎨', title:'Diseño Personalizado',    desc:'Cada evento es único. Adaptamos cada detalle a tu visión y presupuesto.' },
  { icon:'⏰', title:'Puntualidad Garantizada', desc:'Llegamos antes que tus invitados. La puntualidad es nuestro compromiso.' },
  { icon:'💎', title:'Materiales Premium',      desc:'Usamos solo materiales y equipos de primera calidad para resultados excepcionales.' },
  { icon:'📸', title:'Momentos Memorables',     desc:'Creamos experiencias que quedarán en la memoria de todos tus invitados.' },
  { icon:'🤝', title:'Atención Personalizada',  desc:'Equipo dedicado disponible antes, durante y después de tu evento.' },
];

/* ── Tarjeta desktop (sin cambios) ── */
function WhyCard({ item, i }: { item: typeof DEFAULT_ITEMS[0]; i: number }) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const ACCENT = '#d4a017';
  const BG     = '#0a1628';
  const active = hovered;

  /* Tilt 3D: la card se inclina siguiendo el cursor */
  const onTiltMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    el.style.transition = 'transform .1s ease-out, border-radius .5s ease-in-out, box-shadow .5s ease-in-out';
    el.style.transform  = `perspective(900px) rotateX(${-y * 9}deg) rotateY(${x * 11}deg) scale(1.06)`;
  };
  const onTiltLeave = () => {
    const el = cardRef.current; if (!el) return;
    el.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1), border-radius .5s ease-in-out, box-shadow .5s ease-in-out';
    el.style.transform  = '';
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={onTiltMove}
      onMouseLeave={() => { setHovered(false); onTiltLeave(); }}
      onClick={() => setHovered(h => !h)}
      className="why-card"
      style={{
        width: '100%', height: 200,
        background: BG,
        position: 'relative',
        display: 'grid', placeContent: 'center',
        borderRadius: active ? 0 : 10,
        overflow: 'hidden',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        transition: 'border-radius .5s ease-in-out, box-shadow .5s ease-in-out',
        cursor: 'pointer',
        zIndex: active ? 10 : 1,
        boxShadow: active
          ? '0 20px 60px rgba(0,0,0,0.5)'
          : '0 4px 20px rgba(0,0,0,0.25)',
      }}
    >
      {/* ── Borde animado ── */}
      <div style={{
        position: 'absolute', inset: active ? 15 : 0,
        border: `2px solid ${ACCENT}`,
        opacity: active ? 1 : 0,
        transform: active ? 'rotate(0deg)' : 'rotate(10deg)',
        transition: 'all 0.5s ease-in-out',
        borderRadius: 4,
        pointerEvents: 'none',
        zIndex: 5,
      }}/>

      {/* ── Texto inferior ── */}
      <span style={{
        position: 'absolute', left: '50%', bottom: 13,
        transform: 'translateX(-50%)',
        fontSize: '0.55rem', textTransform: 'uppercase',
        padding: '0 5px 0 8px', color: ACCENT,
        background: BG, opacity: active ? 1 : 0,
        letterSpacing: active ? '3px' : '7px',
        transition: 'all 0.5s ease-in-out',
        whiteSpace: 'nowrap', zIndex: 6,
      }}>
        J&M Decoraciones y Eventos
      </span>

      {/* ── Contenido central ── */}
      <div style={{ transition: 'all 0.5s ease-in-out', textAlign: 'center', position: 'relative', zIndex: 3 }}>

        {/* Ícono con efecto trail */}
        <div style={{ position: 'relative', height: 52, width: 52, margin: '0 auto 12px', overflow: 'hidden' }}>
          <div style={{
            fontSize: '2.2rem', lineHeight: '52px', textAlign: 'center',
            position: 'absolute', left: 0, top: 0, width: 52, height: 52,
            filter: `drop-shadow(0 2px 8px ${ACCENT}55)`,
          }}>
            {item.icon}
          </div>
          <div style={{
            position: 'absolute', right: 0, height: '100%', width: '100%',
            opacity: hovered ? 0 : 0,
            background: `linear-gradient(90deg, rgba(212,160,23,0) 70%, ${ACCENT} 100%)`,
            animation: hovered ? 'whyTrail 1s ease-in-out' : 'none',
            pointerEvents: 'none',
          }}/>
        </div>

        {/* Título */}
        <h3 style={{
          fontFamily: 'var(--font-playfair)', fontWeight: 700,
          fontSize: '0.9rem', color: ACCENT,
          margin: '0 0 6px', padding: '0 1rem',
          letterSpacing: active ? '0.5px' : '0',
          transition: 'all 0.5s ease-in-out',
        }}>
          {item.title}
        </h3>

        {/* Descripción */}
        <p className="why-desc" style={{
          color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem',
          lineHeight: 1.55, margin: 0, padding: '0 1.25rem',
          opacity: active ? 1 : 0,
          transform: active ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.45s ease-in-out 0.15s',
          maxHeight: active ? 80 : 0,
        }}>
          {item.desc}
        </p>
      </div>

      {/* Número decorativo */}
      <div style={{
        position: 'absolute', bottom: -10, right: 10,
        fontFamily: 'var(--font-playfair)', fontWeight: 900,
        fontSize: '5rem', lineHeight: 1,
        color: active ? `rgba(212,160,23,0.06)` : 'rgba(255,255,255,0.03)',
        userSelect: 'none', pointerEvents: 'none', zIndex: 1,
        transition: 'color 0.5s ease-in-out',
      }}>
        {String(i + 1).padStart(2, '0')}
      </div>

      <style>{`
        @keyframes whyTrail {
          0%  { background: linear-gradient(90deg,rgba(212,160,23,0) 90%,#d4a017 100%); opacity:0; }
          30% { background: linear-gradient(90deg,rgba(212,160,23,0) 70%,#d4a017 100%); opacity:1; }
          70% { background: linear-gradient(90deg,rgba(212,160,23,0) 70%,#d4a017 100%); opacity:1; }
          95% { background: linear-gradient(90deg,rgba(212,160,23,0) 90%,#d4a017 100%); opacity:0; }
        }
      `}</style>
    </div>
  );
}

/* ── Tarjeta mobile accordion ── */
function WhyCardMobile({ item, i, isOpen, onToggle }: {
  item: typeof DEFAULT_ITEMS[0]; i: number; isOpen: boolean; onToggle: () => void;
}) {
  const ACCENT = '#d4a017';
  return (
    <div
      onClick={onToggle}
      style={{
        background: '#0a1628',
        borderRadius: 16,
        border: `1px solid ${isOpen ? 'rgba(212,160,23,0.35)' : 'rgba(212,160,23,0.08)'}`,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.3s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Cabecera siempre visible */}
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'1rem 1.25rem' }}>
        <div style={{
          width:48, height:48, borderRadius:14, flexShrink:0,
          background: isOpen ? 'rgba(212,160,23,0.18)' : 'rgba(212,160,23,0.1)',
          border: '1px solid rgba(212,160,23,0.2)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'1.5rem',
          transform: isOpen ? 'scale(1.05)' : 'scale(1)',
          transition:'all 0.3s',
        }}>
          {item.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:'0.75rem', fontWeight:700, color:'rgba(212,160,23,0.5)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:2 }}>
            {String(i + 1).padStart(2, '0')}
          </div>
          <div style={{ fontFamily:'var(--font-playfair)', fontSize:'0.95rem', fontWeight:700, color:ACCENT, lineHeight:1.2 }}>
            {item.title}
          </div>
        </div>
        <div style={{
          width:28, height:28, borderRadius:8, flexShrink:0,
          background: isOpen ? 'rgba(212,160,23,0.15)' : 'rgba(255,255,255,0.05)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke={isOpen ? ACCENT : 'rgba(255,255,255,0.5)'}
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Cuerpo expandible */}
      <div style={{
        maxHeight: isOpen ? 160 : 0,
        overflow:'hidden',
        transition:'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ padding:'0 1.25rem 1.25rem', paddingLeft:'calc(1.25rem + 48px + 14px)' }}>
          <div style={{ height:1, background:'linear-gradient(90deg,rgba(212,160,23,0.3),transparent)', marginBottom:10 }}/>
          <p style={{ color:'rgba(255,255,255,0.65)', fontSize:'0.82rem', lineHeight:1.6, margin:'0 0 10px' }}>
            {item.desc}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function WhyUsSection({ data }: { data: any }) {
  const rawItems = data?.items || DEFAULT_ITEMS;
  const items = rawItems.filter((item: any) => item.visible !== false);
  const h2    = data?.h2   || '¿Por qué <em>elegirnos</em>?';
  const desc  = data?.desc || 'Más de una década transformando celebraciones en Sechura, Piura.';

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(prev => prev === i ? null : i);

  return (
    <section style={{ padding:'6rem 0', background:'#f0f4f8', position:'relative', overflow:'hidden' }}>
      {/* Decoración de fondo */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
                     background:'linear-gradient(90deg,transparent,#d4a017,transparent)' }}/>
      <div className="float-y-slow float-delay-2"
           style={{ position:'absolute', top:-100, right:-100, width:400, height:400, borderRadius:'50%',
                     background:'radial-gradient(circle,rgba(212,160,23,0.05) 0%,transparent 70%)', pointerEvents:'none' }}/>

      <div className="container">
        {/* Header */}
        <div className="reveal" style={{ textAlign:'center', marginBottom:'4rem' }}>
          <div className="float-y-tiny"
               style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:'1rem',
                         padding:'0.4rem 1.5rem', borderRadius:9999,
                         background:'rgba(30,58,95,0.07)', border:'1px solid rgba(30,58,95,0.18)',
                         color:'#1e3a5f', fontSize:'0.75rem', fontWeight:700,
                         textTransform:'uppercase', letterSpacing:'.12em' }}>
            ✨ Por qué elegirnos
          </div>
          <h2 style={{ color:'#0a1628', fontSize:'clamp(2rem,4vw,3rem)' }}
              dangerouslySetInnerHTML={{ __html: h2 }}/>
          <p style={{ color:'#64748b', fontSize:'1.05rem', maxWidth:500, margin:'0.75rem auto 0' }}>{desc}</p>
        </div>

        {/* Desktop: grid de tarjetas con hover (sin cambios) */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1.5rem' }}
             className="why-grid why-desktop">
          {items.map((item: any, i: number) => (
            <div key={i} className={`reveal stagger-${Math.min(i+1,8)}`}>
              <WhyCard item={item} i={i}/>
            </div>
          ))}
        </div>

        {/* Mobile: accordion exclusivo */}
        <div className="why-mobile" style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {items.map((item: any, i: number) => (
            <WhyCardMobile
              key={i}
              item={item}
              i={i}
              isOpen={openIndex === i}
              onToggle={() => toggle(i)}
            />
          ))}
        </div>
      </div>

      <style>{`
        /* Desktop: mostrar grid, ocultar accordion */
        .why-desktop { display: grid !important; }
        .why-mobile  { display: none !important; }

        /* Mobile: ocultar grid, mostrar accordion */
        @media(max-width:768px){
          .why-desktop { display: none !important; }
          .why-mobile  { display: flex !important; }
        }

        @media(max-width:900px){ .why-grid{ grid-template-columns:1fr 1fr !important; } }
        @media(max-width:600px){ .why-grid{ grid-template-columns:1fr 1fr !important; gap:1rem !important; } }
        @media(max-width:400px){ .why-grid{ grid-template-columns:1fr !important; } }
      `}</style>
    </section>
  );
}
