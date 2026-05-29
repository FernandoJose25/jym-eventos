'use client';
import { useState, useRef, useEffect } from 'react';

interface GalleryItem {
  id:string; url:string; alt:string;
  focalX?:number; focalY?:number; categoria?:string;
}

export default function GallerySection({ items }: { items: GalleryItem[] }) {
  const [activeIdx,  setActiveIdx]  = useState<number|null>(null);
  const [centerIdx,  setCenterIdx]  = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoRef  = useRef<ReturnType<typeof setInterval>|null>(null);

  const total = items?.length || 0;

  useEffect(() => {
    if (total < 2) return;
    autoRef.current = setInterval(() => {
      setCenterIdx(p => (p + 1) % total);
    }, 3200);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [total]);

  const go = (dir: 1|-1) => {
    if (autoRef.current) clearInterval(autoRef.current);
    setCenterIdx(p => (p + dir + total) % total);
  };

  if (!total) return null;

  // Visible: center ±3
  const visible = [-3,-2,-1,0,1,2,3].map(offset => {
    const idx = (centerIdx + offset + total) % total;
    return { idx, offset, item: items[idx] };
  });

  return (
    <section style={{ padding:'6rem 0', background:'linear-gradient(180deg,#f0f4f8 0%,#e8eef5 100%)',
                       position:'relative', overflow:'hidden' }}>
      <div style={{ textAlign:'center', marginBottom:'3rem' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:'1rem',
                       padding:'0.35rem 1.25rem', borderRadius:9999,
                       background:'rgba(30,58,95,0.08)', border:'1px solid rgba(30,58,95,0.2)',
                       color:'#1e3a5f', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em' }}>
          📸 Nuestra Galería
        </div>
        <h2 style={{ color:'#0a1628', fontSize:'clamp(2rem,4vw,3rem)' }}>
          Momentos que <em>hablan</em> por sí solos
        </h2>
      </div>

      {/* Carrusel cinematográfico */}
      <div style={{ position:'relative', height:440, display:'flex', alignItems:'center', justifyContent:'center' }}>

        {visible.map(({ idx, offset, item }) => {
          const abs     = Math.abs(offset);
          const isCenter = offset === 0;
          const scale    = isCenter ? 1 : abs===1 ? 0.82 : abs===2 ? 0.66 : 0.52;
          const zIndex   = 10 - abs;
          const tx       = offset * 220;
          const brightness = isCenter ? 1 : abs===1 ? 0.75 : abs===2 ? 0.55 : 0.35;
          const op       = abs > 2 ? 0.4 : 1;
          const fp       = `${(item.focalX??0.5)*100}% ${(item.focalY??0.5)*100}%`;

          return (
            <div key={`${idx}-${offset}`}
                 onClick={() => { if (isCenter) setActiveIdx(idx); else setCenterIdx(idx); }}
                 style={{
                   position:'absolute',
                   width:340, height:400,
                   borderRadius:18,
                   overflow:'hidden',
                   transform:`translateX(${tx}px) scale(${scale})`,
                   zIndex,
                   transition:'all .6s cubic-bezier(0.23,1,0.32,1)',
                   cursor:'pointer',
                   filter:`brightness(${brightness})`,
                   opacity:op,
                   boxShadow: isCenter
                     ? '0 32px 80px rgba(10,22,40,0.35), 0 0 0 3px rgba(212,160,23,0.4)'
                     : '0 16px 40px rgba(10,22,40,0.2)',
                 }}>
              <img src={item.url} alt={item.alt || 'Evento J&M'}
                   style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:fp,
                             transition:'transform .6s', transform:isCenter?'scale(1.05)':'scale(1)' }}
                   loading="lazy"/>
              {isCenter && (
                <div style={{ position:'absolute', inset:0,
                               background:'linear-gradient(to top,rgba(10,22,40,0.6) 0%,transparent 50%)' }}>
                  <div style={{ position:'absolute', bottom:20, left:20, right:20 }}>
                    <span style={{ background:'rgba(212,160,23,0.9)', color:'#0a1628', fontSize:'0.72rem',
                                    fontWeight:700, padding:'3px 10px', borderRadius:999, textTransform:'uppercase',
                                    letterSpacing:'.08em' }}>
                      {item.categoria || 'Evento J&M'}
                    </span>
                    <p style={{ color:'rgba(255,255,255,0.9)', fontSize:'0.82rem', marginTop:6 }}>{item.alt}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Flechas */}
        {[-1,1].map(dir => (
          <button key={dir} onClick={()=>go(dir as -1|1)}
                  style={{ position:'absolute', [dir===-1?'left':'right']:'calc(50% - 260px)',
                             zIndex:20, width:48, height:48, borderRadius:'50%',
                             background:'rgba(255,255,255,0.9)', border:'none', cursor:'pointer',
                             display:'flex', alignItems:'center', justifyContent:'center',
                             boxShadow:'0 4px 16px rgba(10,22,40,0.2)',
                             fontSize:'1.1rem', color:'#1e3a5f', transition:'all .2s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='#d4a017';(e.currentTarget as HTMLElement).style.color='#fff';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.9)';(e.currentTarget as HTMLElement).style.color='#1e3a5f';}}>
            {dir===-1?'←':'→'}
          </button>
        ))}
      </div>

      {/* Dots */}
      <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:'2rem' }}>
        {items.map((_,i) => (
          <button key={i} onClick={()=>setCenterIdx(i)}
                  style={{ width:i===centerIdx?24:7, height:7, borderRadius:9999, border:'none', cursor:'pointer',
                             background:i===centerIdx?'#d4a017':'rgba(10,22,40,0.2)', transition:'all .4s', padding:0 }}/>
        ))}
      </div>

      {/* Ver galería completa */}
      <div style={{ textAlign:'center', marginTop:'2.5rem' }}>
        <a href="/galeria"
           style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0.875rem 2rem',
                     borderRadius:9999, background:'linear-gradient(135deg,#0a1628,#1e3a5f)',
                     color:'#fff', fontWeight:700, textDecoration:'none',
                     boxShadow:'0 4px 16px rgba(10,22,40,0.25)', transition:'all .25s' }}
           onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
           onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform=''}>
          Ver galería completa
          <span style={{ fontSize:'1.1rem' }}>→</span>
        </a>
      </div>

      {/* Lightbox */}
      {activeIdx !== null && (
        <div onClick={()=>setActiveIdx(null)}
             style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(5,13,26,0.95)',
                       backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center',
                       padding:24, cursor:'zoom-out' }}>
          <div onClick={e=>e.stopPropagation()}
               style={{ maxWidth:900, width:'100%', borderRadius:20, overflow:'hidden',
                         boxShadow:'0 40px 100px rgba(0,0,0,0.6)', cursor:'default',
                         animation:'lbIn .3s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <img src={items[activeIdx].url} alt={items[activeIdx].alt}
                 style={{ width:'100%', maxHeight:'80vh', objectFit:'contain', display:'block', background:'#0a1628' }}/>
          </div>
          <button onClick={()=>setActiveIdx(null)}
                  style={{ position:'absolute', top:24, right:24, background:'rgba(255,255,255,0.15)',
                             border:'none', borderRadius:'50%', width:44, height:44, cursor:'pointer',
                             color:'#fff', fontSize:'1.25rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ✕
          </button>
          <button onClick={()=>setActiveIdx(p=>((p!-1+total)%total))}
                  style={{ position:'absolute', left:24, top:'50%', transform:'translateY(-50%)',
                             background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%',
                             width:48, height:48, cursor:'pointer', color:'#fff', fontSize:'1.25rem',
                             display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
          <button onClick={()=>setActiveIdx(p=>((p!+1)%total))}
                  style={{ position:'absolute', right:24, top:'50%', transform:'translateY(-50%)',
                             background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%',
                             width:48, height:48, cursor:'pointer', color:'#fff', fontSize:'1.25rem',
                             display:'flex', alignItems:'center', justifyContent:'center' }}>→</button>
        </div>
      )}

      <style>{`@keyframes lbIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}`}</style>
    </section>
  );
}