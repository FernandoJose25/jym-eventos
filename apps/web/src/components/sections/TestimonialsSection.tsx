'use client';
import { useState, useEffect } from 'react';
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

function FlipCard({ t, idx }: { t: Testimonial; idx: number }) {
  const [flipped, setFlipped] = useState(false);
  const fp = `${(t.focalX??0.5)*100}% ${(t.focalY??0.5)*100}%`;
  const initials = t.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase();
  const col = COLORS[idx % COLORS.length];

  return (
    <div
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      style={{ width:190, height:254, overflow:'visible', flexShrink:0, cursor:'pointer' }}
    >
      {/* Content wrapper — gira en Y */}
      <div style={{
        width:'100%', height:'100%',
        transformStyle:'preserve-3d',
        transition:'transform 300ms ease',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        boxShadow:'0px 0px 10px 1px rgba(0,0,0,0.93)',
        borderRadius:5,
        position:'relative',
      }}>

        {/* ══ BACK — foto/avatar + borde giratorio ══ */}
        <div style={{
          background:'#151515', position:'absolute', width:'100%', height:'100%',
          backfaceVisibility:'hidden', borderRadius:5, overflow:'hidden',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {/* Borde giratorio */}
          <div style={{
            position:'absolute', width:160, height:'160%',
            background:`linear-gradient(90deg,transparent,${col.c1},${col.c1},${col.c1},${col.c1},transparent)`,
            animation:'rotation_481 5s linear infinite',
            pointerEvents:'none',
          }}/>

          {/* Contenido del back */}
          <div style={{
            position:'absolute', width:'99%', height:'99%',
            background:'#151515', borderRadius:5,
            display:'flex', flexDirection:'column',
            justifyContent:'center', alignItems:'center', gap:16,
            overflow:'hidden',
          }}>
            {/* Foto o avatar con círculos flotantes */}
            {t.avatar ? (
              <>
                <img src={t.avatar} alt={t.name}
                     style={{ position:'absolute', width:'100%', height:'100%',
                               objectFit:'cover', objectPosition:fp, opacity:.7 }}/>
                {/* Overlay degradado */}
                <div style={{ position:'absolute', inset:0,
                               background:'linear-gradient(to top,rgba(21,21,21,0.85),rgba(21,21,21,0.2))' }}/>
              </>
            ) : (
              /* Círculos blur flotantes si no hay foto */
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

            {/* Iniciales o ícono */}
            <div style={{ position:'relative', zIndex:2,
                           width:64, height:64, borderRadius:'50%',
                           background:'rgba(255,255,255,0.15)',
                           border:`2px solid ${col.c1}`,
                           display:'flex', alignItems:'center', justifyContent:'center',
                           fontFamily:'var(--font-playfair)', fontSize:'1.5rem',
                           fontWeight:700, color:'#fff',
                           overflow: t.avatar ? 'hidden' : 'visible' }}>
              {t.avatar
                ? <img src={t.avatar} alt={t.name} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:fp }}/>
                : initials}
            </div>

            <div style={{ position:'relative', zIndex:2, textAlign:'center', padding:'0 12px' }}>
              <p style={{ color:'#fff', fontFamily:'var(--font-playfair)', fontWeight:700,
                           fontSize:'0.9rem', margin:'0 0 4px' }}>{t.name}</p>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.65rem', margin:0 }}>{t.role}</p>
            </div>

            <strong style={{ position:'relative', zIndex:2, color:'rgba(255,255,255,0.5)',
                               fontSize:'0.65rem', letterSpacing:'.1em', textTransform:'uppercase' }}>
              Hover Me
            </strong>
          </div>
        </div>

        {/* ══ FRONT — testimonio (visible tras el flip) ══ */}
        <div style={{
          background:'#151515', position:'absolute', width:'100%', height:'100%',
          backfaceVisibility:'hidden', borderRadius:5, overflow:'hidden',
          transform:'rotateY(180deg)',
          color:'#fff',
        }}>
          {/* Imagen de fondo tenue */}
          {t.avatar && (
            <img src={t.avatar} alt={t.name}
                 style={{ position:'absolute', width:'100%', height:'100%',
                           objectFit:'cover', objectPosition:fp, opacity:.18 }}/>
          )}

          {/* Círculos decorativos */}
          <div style={{ position:'absolute', width:90, height:90, borderRadius:'50%',
                         background:col.c1, filter:'blur(20px)', top:40, left:20, opacity:.25,
                         animation:'floating 2600ms linear infinite' }}/>
          <div style={{ position:'absolute', width:110, height:110, borderRadius:'50%',
                         background:col.c2, filter:'blur(20px)', top:0, left:60, opacity:.2,
                         animation:'floating 2600ms linear infinite', animationDelay:'-800ms' }}/>

          {/* Contenido front */}
          <div style={{
            position:'absolute', width:'100%', height:'100%',
            padding:10, display:'flex', flexDirection:'column',
            justifyContent:'space-between', boxSizing:'border-box',
          }}>
            {/* Badge rol */}
            <span style={{
              background:'rgba(0,0,0,0.4)', padding:'2px 10px',
              borderRadius:10, backdropFilter:'blur(2px)',
              width:'fit-content', fontSize:'0.65rem', color:'rgba(255,255,255,0.75)',
            }}>
              {t.role}
            </span>

            {/* Texto y nombre */}
            <div style={{
              boxShadow:'0px 0px 10px 5px rgba(0,0,0,0.53)',
              width:'100%', padding:10,
              background:'rgba(0,0,0,0.6)', backdropFilter:'blur(5px)',
              borderRadius:5,
            }}>
              {/* Estrellas */}
              <div style={{ display:'flex', gap:2, marginBottom:6 }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} style={{ fontSize:'0.75rem', color:n<=(t.stars||5)?'#f59e0b':'#444' }}>★</span>
                ))}
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <p style={{ fontSize:'0.72rem', fontFamily:'var(--font-playfair)', fontWeight:700,
                              color:'#fff', margin:0, width:'80%', lineHeight:1.3 }}>
                  {t.name}
                </p>
              </div>

              <p style={{ color:'rgba(255,255,255,0.6)', marginTop:5, fontSize:'0.7rem', lineHeight:1.5 }}>
                "{t.text?.slice(0,100)}{(t.text?.length||0)>100?'…':'"'}"
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function TestimonialsSection({ items: propItems }: { items?: Testimonial[] }) {
  const [items, setItems] = useState<Testimonial[]>([]);

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
        <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.95rem', maxWidth:460, margin:'0 auto' }}>
          Pasa el cursor sobre cada tarjeta para ver el testimonio
        </p>
      </div>

      {/* Carrusel */}
      <div style={{ overflow:'hidden', padding:'2rem 0', position:'relative' }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:100, zIndex:10,
                       background:'linear-gradient(to right,#0a1628,transparent)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', right:0, top:0, bottom:0, width:100, zIndex:10,
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
          ✦ Hover sobre cada tarjeta para revelar ✦
        </p>
      </div>

      <style>{`
        @keyframes rotation_481 {
          0%   { transform: rotateZ(0deg); }
          100% { transform: rotateZ(360deg); }
        }
        @keyframes floating {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(10px); }
        }
      `}</style>
    </section>
  );
}