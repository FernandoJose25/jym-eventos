'use client';
import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Testimonial {
  id:string; name:string; role:string; text:string;
  stars:number; avatar?:string; focalX?:number; focalY?:number;
}

const COLORS = [
  { c1:'#ff9966', c2:'#ff6644', c3:'#ff2233' },
  { c1:'#a855f7', c2:'#7c3aed', c3:'#4f46e5' },
  { c1:'#f5c842', c2:'#d4a017', c3:'#b8860b' },
  { c1:'#14b8a6', c2:'#0f766e', c3:'#0d9488' },
  { c1:'#ec4899', c2:'#be185d', c3:'#9d174d' },
  { c1:'#06b6d4', c2:'#0284c7', c3:'#1d4ed8' },
];

/* ══════════════════════════════════════════════════════
   DESKTOP — flip card (original, sin cambios)
══════════════════════════════════════════════════════ */
function FlipCard({ t, idx }: { t: Testimonial; idx: number }) {
  const [flipped, setFlipped] = useState(false);
  const [imgError, setImgError] = useState(false);
  const toggleFlip = () => setFlipped(f => !f);
  const fp = `${(t.focalX??0.5)*100}% ${(t.focalY??0.5)*100}%`;
  const hasAvatar = !!(t.avatar && !imgError);
  const initials = t.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase();
  const col = COLORS[idx % COLORS.length];

  return (
    <div
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={toggleFlip}
      style={{ width:240, height:320, overflow:'visible', flexShrink:0, cursor:'pointer' }}
    >
      <div style={{
        width:'100%', height:'100%',
        transformStyle:'preserve-3d',
        transition:'transform 300ms ease',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        boxShadow:'0px 0px 10px 1px rgba(0,0,0,0.93)',
        borderRadius:5,
        position:'relative',
      }}>
        {/* BACK */}
        <div style={{
          background:'#151515', position:'absolute', width:'100%', height:'100%',
          backfaceVisibility:'hidden', borderRadius:5, overflow:'hidden',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <div style={{
            position:'absolute', width:160, height:'160%',
            background:`linear-gradient(90deg,transparent,${col.c1},${col.c1},${col.c1},${col.c1},transparent)`,
            animation:'rotation_481 5s linear infinite',
            pointerEvents:'none',
          }}/>
          <div style={{
            position:'absolute', width:'99%', height:'99%',
            background:'#151515', borderRadius:5,
            display:'flex', flexDirection:'column',
            justifyContent:'center', alignItems:'center', gap:16,
            overflow:'hidden',
          }}>
            {hasAvatar ? (
              <>
                <img src={t.avatar} alt={t.name} onError={() => setImgError(true)}
                     style={{ position:'absolute', width:'100%', height:'100%',
                               objectFit:'cover', objectPosition:fp, opacity:.7 }}/>
                <div style={{ position:'absolute', inset:0,
                               background:'linear-gradient(to top,rgba(21,21,21,0.85),rgba(21,21,21,0.2))' }}/>
              </>
            ) : (
              <>
                <div style={{ position:'absolute', width:90, height:90, borderRadius:'50%',
                               background:col.c1, filter:'blur(15px)', top:40, left:20,
                               animation:'floating 2600ms linear infinite' }}/>
                <div style={{ position:'absolute', width:150, height:150, borderRadius:'50%',
                               background:col.c2, filter:'blur(15px)', top:0, left:50,
                               animation:'floating 2600ms linear infinite', animationDelay:'-800ms' }}/>
                <div style={{ position:'absolute', width:30, height:30, borderRadius:'50%',
                               background:col.c3, filter:'blur(15px)', top:-80, left:160,
                               animation:'floating 2600ms linear infinite', animationDelay:'-1800ms' }}/>
              </>
            )}
            <div style={{ position:'relative', zIndex:2,
                           width:76, height:76, borderRadius:'50%',
                           background:'rgba(255,255,255,0.15)',
                           border:`2px solid ${col.c1}`,
                           display:'flex', alignItems:'center', justifyContent:'center',
                           fontFamily:'var(--font-playfair)', fontSize:'1.5rem',
                           fontWeight:700, color:'#fff',
                           overflow: hasAvatar ? 'hidden' : 'visible' }}>
              {hasAvatar
                ? <img src={t.avatar} alt={t.name} onError={() => setImgError(true)} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:fp }}/>
                : initials}
            </div>
            <div style={{ position:'relative', zIndex:2, textAlign:'center', padding:'0 12px' }}>
              <p style={{ color:'#fff', fontFamily:'var(--font-playfair)', fontWeight:700,
                           fontSize:'1.05rem', margin:'0 0 4px' }}>{t.name}</p>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.75rem', margin:0 }}>{t.role}</p>
            </div>
            <strong style={{ position:'relative', zIndex:2, color:'rgba(255,255,255,0.5)',
                               fontSize:'0.72rem', letterSpacing:'.1em', textTransform:'uppercase' }}>
              Ver →
            </strong>
          </div>
        </div>

        {/* FRONT */}
        <div style={{
          background:'#151515', position:'absolute', width:'100%', height:'100%',
          backfaceVisibility:'hidden', borderRadius:5, overflow:'hidden',
          transform:'rotateY(180deg)', color:'#fff',
        }}>
          {hasAvatar && (
            <img src={t.avatar} alt={t.name} onError={() => setImgError(true)}
                 style={{ position:'absolute', width:'100%', height:'100%',
                           objectFit:'cover', objectPosition:fp, opacity:.18 }}/>
          )}
          <div style={{ position:'absolute', width:90, height:90, borderRadius:'50%',
                         background:col.c1, filter:'blur(20px)', top:40, left:20, opacity:.25,
                         animation:'floating 2600ms linear infinite' }}/>
          <div style={{ position:'absolute', width:110, height:110, borderRadius:'50%',
                         background:col.c2, filter:'blur(20px)', top:0, left:60, opacity:.2,
                         animation:'floating 2600ms linear infinite', animationDelay:'-800ms' }}/>
          <div style={{
            position:'absolute', width:'100%', height:'100%',
            padding:10, display:'flex', flexDirection:'column',
            justifyContent:'space-between', boxSizing:'border-box',
          }}>
            <span style={{
              background:'rgba(0,0,0,0.4)', padding:'2px 10px',
              borderRadius:10, backdropFilter:'blur(2px)',
              width:'fit-content', fontSize:'0.65rem', color:'rgba(255,255,255,0.75)',
            }}>
              {t.role}
            </span>
            <div style={{
              boxShadow:'0px 0px 10px 5px rgba(0,0,0,0.53)',
              width:'100%', padding:10,
              background:'rgba(0,0,0,0.6)', backdropFilter:'blur(5px)',
              borderRadius:5,
            }}>
              <div style={{ display:'flex', gap:2, marginBottom:6 }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} style={{ fontSize:'0.75rem', color:n<=(t.stars||5)?'#f59e0b':'#444' }}>★</span>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <p style={{ fontSize:'0.85rem', fontFamily:'var(--font-playfair)', fontWeight:700,
                              color:'#fff', margin:0, width:'80%', lineHeight:1.3 }}>
                  {t.name}
                </p>
              </div>
              <p style={{ color:'rgba(255,255,255,0.6)', marginTop:5, fontSize:'0.8rem', lineHeight:1.5,
                           maxHeight:150, overflowY:'auto' }}>
                "{t.text}"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MOBILE — tarjeta de slider (texto siempre visible)
══════════════════════════════════════════════════════ */
function MobileCard({ t, idx }: { t: Testimonial; idx: number }) {
  const [imgError, setImgError] = useState(false);
  const col = COLORS[idx % COLORS.length];
  const fp = `${(t.focalX??0.5)*100}% ${(t.focalY??0.5)*100}%`;
  const hasAvatar = !!(t.avatar && !imgError);
  const initials = t.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase();

  return (
    <div style={{
      flexShrink:0,
      width:'82vw',
      maxWidth:320,
      scrollSnapAlign:'center',
      borderRadius:20,
      overflow:'hidden',
      background:'rgba(255,255,255,0.04)',
      border:'1px solid rgba(255,255,255,0.08)',
      backdropFilter:'blur(10px)',
      position:'relative',
    }}>
      {/* Orbe de color */}
      <div style={{
        position:'absolute', top:-30, right:-30,
        width:120, height:120, borderRadius:'50%',
        background:col.c1, filter:'blur(30px)', opacity:0.35,
        pointerEvents:'none',
      }}/>

      <div style={{ padding:'1.25rem 1.25rem 1rem', position:'relative', zIndex:2 }}>
        {/* Comillas */}
        <span style={{
          fontSize:'3rem', lineHeight:1,
          color:'rgba(212,160,23,0.2)',
          fontFamily:'var(--font-playfair)',
          display:'block', marginBottom:'-0.5rem',
        }}>"</span>

        {/* Estrellas */}
        <div style={{ display:'flex', gap:3, marginBottom:'0.75rem' }}>
          {[1,2,3,4,5].map(n => (
            <span key={n} style={{ fontSize:'0.8rem', color:n<=(t.stars||5)?'#f59e0b':'rgba(255,255,255,0.15)' }}>★</span>
          ))}
        </div>

        {/* Texto */}
        <p style={{
          color:'rgba(255,255,255,0.82)', fontSize:'0.88rem',
          lineHeight:1.65, fontStyle:'italic', marginBottom:'1rem',
        }}>
          {t.text}
        </p>
      </div>

      {/* Separador */}
      <div style={{ height:1, background:'linear-gradient(90deg,rgba(212,160,23,0.3),transparent)', margin:'0 1.25rem' }}/>

      {/* Footer */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'1rem 1.25rem 1.25rem', position:'relative', zIndex:2 }}>
        <div style={{
          width:44, height:44, borderRadius:'50%', flexShrink:0,
          background:`linear-gradient(135deg,${col.c1},${col.c2})`,
          border:'2px solid rgba(212,160,23,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--font-playfair)', fontSize:'1rem', fontWeight:700, color:'#fff',
          overflow: hasAvatar ? 'hidden' : 'visible',
        }}>
          {hasAvatar
            ? <img src={t.avatar} alt={t.name} onError={() => setImgError(true)} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:fp }}/>
            : initials}
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:'0.88rem', color:'#fff', marginBottom:2 }}>{t.name}</div>
          <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)' }}>{t.role}</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SECCIÓN PRINCIPAL
══════════════════════════════════════════════════════ */
export default function TestimonialsSection({ items: propItems }: { items?: Testimonial[] }) {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (propItems && propItems.length > 0) { setItems(propItems); return; }
    getDocs(query(collection(db,'testimonials'), where('visible','==',true), orderBy('order','asc')))
      .then(snap => {
        const data = snap.docs.map(d => {
          const r = d.data();
          return { id:d.id, name:r.name||r.nombre||'', role:r.role||r.cargo||'',
                   text:r.text||r.texto||'', stars:r.stars||r.estrellas||5,
                   avatar:r.avatar||r.foto||'', focalX:r.focalX??0.5, focalY:r.focalY??0.5 } as Testimonial;
        }).filter(t=>t.name);
        if (data.length>0) setItems(data);
      }).catch(console.error);
  }, [propItems]);

  /* Actualizar dot al hacer scroll en mobile */
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const cards = track.children;
    const cx = track.scrollLeft + track.clientWidth / 2;
    let closest = 0, minDist = Infinity;
    for (let i = 0; i < cards.length; i++) {
      const el = cards[i] as HTMLElement;
      const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - cx);
      if (dist < minDist) { minDist = dist; closest = i; }
    }
    setActiveIdx(closest);
  };

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[i] as HTMLElement;
    track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2, behavior:'smooth' });
  };

  if (items.length === 0) return null;

  const list = [...items, ...items, ...items];

  return (
    <section style={{ padding:'6rem 0',
      background:'linear-gradient(135deg,#0a1628 0%,#1e3a5f 100%)',
      position:'relative', overflow:'hidden' }}>

      <div style={{ position:'absolute', top:-200, right:-200, width:600, height:600,
                     borderRadius:'50%', background:'rgba(212,160,23,0.04)', pointerEvents:'none' }}/>

      {/* Header */}
      <div className="container" style={{ textAlign:'center', marginBottom:'3.5rem' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:'1rem',
                       padding:'0.4rem 1.5rem', borderRadius:9999,
                       background:'rgba(212,160,23,0.1)', border:'1px solid rgba(212,160,23,0.3)',
                       color:'#f5c842', fontSize:'0.7rem', fontWeight:700,
                       textTransform:'uppercase', letterSpacing:'.18em' }}>
          ⭐ Testimonios
        </div>
        <h2 style={{ fontFamily:'var(--font-playfair)', color:'#fff',
                      fontSize:'clamp(2rem,4vw,3rem)', marginBottom:'0.75rem' }}>
          Lo que dicen nuestros{' '}
          <em style={{ color:'#d4a017', fontStyle:'italic' }}>clientes</em>
        </h2>
        <p className="testi-hint-desktop" style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.95rem', maxWidth:460, margin:'0 auto' }}>
          Toca o pasa el cursor sobre cada tarjeta
        </p>
      </div>

      {/* ── DESKTOP: carrusel con flip (original) ── */}
      <div className="testi-desktop">
        <div className="testi-carousel-wrap" style={{ overflow:'hidden', padding:'2rem 0', position:'relative' }}>
          <div className="testi-fade-left" style={{ position:'absolute', left:0, top:0, bottom:0, width:80, zIndex:10,
                         background:'linear-gradient(to right,#0a1628,transparent)', pointerEvents:'none' }}/>
          <div className="testi-fade-right" style={{ position:'absolute', right:0, top:0, bottom:0, width:80, zIndex:10,
                         background:'linear-gradient(to left,#0a1628,transparent)', pointerEvents:'none' }}/>
          <div className="books-track">
            {list.map((t, i) => (
              <FlipCard key={`${t.id}-${i}`} t={t} idx={i % items.length}/>
            ))}
          </div>
        </div>
        <div style={{ textAlign:'center', marginTop:'1.5rem' }}>
          <p style={{ color:'rgba(255,255,255,0.2)', fontSize:'0.7rem',
                       letterSpacing:'.14em', textTransform:'uppercase' }}>
            ✦ Toca cada tarjeta para revelar ✦
          </p>
        </div>
      </div>

      {/* ── MOBILE: slider de swipe con texto visible ── */}
      <div className="testi-mobile">
        <div
          ref={trackRef}
          onScroll={onScroll}
          style={{
            display:'flex', gap:14,
            padding:'0.5rem 1.5rem 1rem',
            overflowX:'auto',
            scrollSnapType:'x mandatory',
            WebkitOverflowScrolling:'touch',
            scrollbarWidth:'none',
          }}
        >
          {items.map((t, i) => (
            <MobileCard key={t.id} t={t} idx={i}/>
          ))}
        </div>

        {/* Dots */}
        <div style={{ display:'flex', justifyContent:'center', gap:7, padding:'0.5rem 0 0' }}>
          {items.map((_, i) => (
            <div
              key={i}
              onClick={() => goTo(i)}
              style={{
                height:6, borderRadius:3, cursor:'pointer',
                background: activeIdx === i ? '#d4a017' : 'rgba(255,255,255,0.2)',
                width: activeIdx === i ? 20 : 6,
                transition:'all 0.3s',
              }}
            />
          ))}
        </div>

        {/* Hint swipe */}
        <div style={{ textAlign:'center', padding:'0.75rem 0 0',
                       color:'rgba(255,255,255,0.2)', fontSize:'0.65rem',
                       textTransform:'uppercase', letterSpacing:'.1em' }}>
          Desliza para ver más →
        </div>
      </div>

      <style>{`
        /* Desktop: mostrar carrusel, ocultar slider */
        .testi-desktop { display: block; }
        .testi-mobile  { display: none; }
        .testi-hint-desktop { display: block; }

        /* Mobile: ocultar carrusel, mostrar slider */
        @media(max-width:768px){
          .testi-desktop { display: none !important; }
          .testi-mobile  { display: block !important; }
          .testi-hint-desktop { display: none !important; }
        }

        /* Smart TV: las tarjetas de flip son de tamaño fijo (240x320);
           se escalan como bloque para no verse pequeñas en pantallas anchas. */
        @media(min-width:1600px){
          .testi-carousel-wrap { padding: 4.5rem 0 !important; }
          .books-track { transform: scale(1.2); transform-origin: center top; }
        }

        @keyframes rotation_481 {
          0%   { transform: rotateZ(0deg); }
          100% { transform: rotateZ(360deg); }
        }
        @keyframes floating {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(10px); }
        }
        @media(max-width:640px){
          .testi-fade-left, .testi-fade-right { width:40px !important; }
          .books-track { gap:1.25rem !important; }
        }
        @media(max-width:480px){
          .testi-fade-left, .testi-fade-right { width:24px !important; }
        }
        /* Ocultar scrollbar en slider mobile */
        .testi-mobile div:first-child::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}
