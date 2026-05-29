'use client';
import { useState } from 'react';

const DEFAULT_ITEMS = [
  { icon:'🏆', title:'Experiencia Comprobada',  desc:'Más de 10 años organizando eventos exitosos en Sechura y toda la región Piura.' },
  { icon:'🎨', title:'Diseño Personalizado',    desc:'Cada evento es único. Adaptamos cada detalle a tu visión y presupuesto.' },
  { icon:'⏰', title:'Puntualidad Garantizada', desc:'Llegamos antes que tus invitados. La puntualidad es nuestro compromiso.' },
  { icon:'💎', title:'Materiales Premium',      desc:'Usamos solo materiales y equipos de primera calidad para resultados excepcionales.' },
  { icon:'📸', title:'Momentos Memorables',     desc:'Creamos experiencias que quedarán en la memoria de todos tus invitados.' },
  { icon:'🤝', title:'Atención Personalizada',  desc:'Equipo dedicado disponible antes, durante y después de tu evento.' },
];

function WhyCard({ item, i }: { item: typeof DEFAULT_ITEMS[0]; i: number }) {
  const [hovered, setHovered] = useState(false);

  // Colores dorado/oscuro del diseño original adaptados a J&M
  const ACCENT = '#d4a017';
  const BG     = '#0a1628';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', height: 200,
        background: BG,
        position: 'relative',
        display: 'grid', placeContent: 'center',
        borderRadius: hovered ? 0 : 10,
        overflow: 'hidden',
        transform: hovered ? 'scale(1.07)' : 'scale(1)',
        transition: 'all 0.5s ease-in-out',
        cursor: 'default',
        zIndex: hovered ? 10 : 1,
        boxShadow: hovered
          ? '0 20px 60px rgba(0,0,0,0.5)'
          : '0 4px 20px rgba(0,0,0,0.25)',
      }}
    >
      {/* ── Borde animado ── */}
      <div style={{
        position: 'absolute', inset: hovered ? 15 : 0,
        border: `2px solid ${ACCENT}`,
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'rotate(0deg)' : 'rotate(10deg)',
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
        background: BG, opacity: hovered ? 1 : 0,
        letterSpacing: hovered ? '3px' : '7px',
        transition: 'all 0.5s ease-in-out',
        whiteSpace: 'nowrap', zIndex: 6,
      }}>
        J&M Eventos y Decoraciones
      </span>

      {/* ── Contenido central ── */}
      <div style={{ transition: 'all 0.5s ease-in-out', textAlign: 'center', position: 'relative', zIndex: 3 }}>

        {/* Ícono con efecto trail */}
        <div style={{ position: 'relative', height: 52, width: 52, margin: '0 auto 12px', overflow: 'hidden' }}>
          {/* Emoji principal */}
          <div style={{
            fontSize: '2.2rem', lineHeight: '52px', textAlign: 'center',
            position: 'absolute', left: 0, top: 0, width: 52, height: 52,
            filter: `drop-shadow(0 2px 8px ${ACCENT}55)`,
          }}>
            {item.icon}
          </div>

          {/* Trail — destello al hover */}
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
          letterSpacing: hovered ? '0.5px' : '0',
          transition: 'all 0.5s ease-in-out',
        }}>
          {item.title}
        </h3>

        {/* Descripción — aparece al hover */}
        <p style={{
          color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem',
          lineHeight: 1.55, margin: 0, padding: '0 1.25rem',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.45s ease-in-out 0.15s',
          maxHeight: hovered ? 80 : 0,
        }}>
          {item.desc}
        </p>
      </div>

      {/* Número decorativo de fondo */}
      <div style={{
        position: 'absolute', bottom: -10, right: 10,
        fontFamily: 'var(--font-playfair)', fontWeight: 900,
        fontSize: '5rem', lineHeight: 1,
        color: hovered ? `rgba(212,160,23,0.06)` : 'rgba(255,255,255,0.03)',
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

export default function WhyUsSection({ data }: { data: any }) {
  const items = data?.items || DEFAULT_ITEMS;
  const h2    = data?.h2   || '¿Por qué <em>elegirnos</em>?';
  const desc  = data?.desc || 'Más de una década transformando celebraciones en Sechura, Piura.';

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
                         color:'#1e3a5f', fontSize:'0.72rem', fontWeight:700,
                         textTransform:'uppercase', letterSpacing:'.12em' }}>
            ✨ Por qué elegirnos
          </div>
          <h2 style={{ color:'#0a1628', fontSize:'clamp(2rem,4vw,3rem)' }}
              dangerouslySetInnerHTML={{ __html: h2 }}/>
          <p style={{ color:'#64748b', fontSize:'1.05rem', maxWidth:500, margin:'0.75rem auto 0' }}>{desc}</p>
        </div>

        {/* Grid 3 columnas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1.5rem' }}
             className="why-grid">
          {items.map((item: any, i: number) => (
            <div key={i} className={`reveal stagger-${Math.min(i+1,8)}`}>
              <WhyCard item={item} i={i}/>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media(max-width:900px){ .why-grid{ grid-template-columns:1fr 1fr !important; } }
        @media(max-width:600px){ .why-grid{ grid-template-columns:1fr !important; } }
      `}</style>
    </section>
  );
}