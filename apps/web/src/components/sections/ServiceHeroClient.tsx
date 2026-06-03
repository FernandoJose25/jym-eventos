'use client';
import { useEffect, useRef } from 'react';
import type { Servicio } from '@/types';
export default function ServiceHeroClient({ servicio: s }: { servicio: Servicio }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    el.style.opacity = '0';
    const t = setTimeout(() => { el.style.transition='opacity .6s ease'; el.style.opacity='1'; }, 50);
    return () => clearTimeout(t);
  }, []);
  const fp = `${(s.hero?.focalX??0.5)*100}% ${(s.hero?.focalY??0.4)*100}%`;
  return (
    <section ref={ref} style={{ minHeight:'60vh', display:'flex', alignItems:'center', position:'relative', overflow:'hidden', background:'linear-gradient(135deg,#050d1a,#0a1628,#1e3a5f)', paddingTop:72 }}>
      {s.hero?.imagen && <div style={{ position:'absolute', inset:0, opacity:.3 }}><img src={s.hero.imagen} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:fp }} /></div>}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(5,13,26,.85),rgba(5,13,26,.35))' }} />
      <div className="container" style={{ position:'relative', zIndex:10, paddingTop:'2rem', paddingBottom:'2.5rem' }}>
        <nav style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.75rem', marginBottom:16, display:'flex', flexWrap:'wrap', gap:'0.25rem', alignItems:'center' }}>
          <a href="/" style={{ color:'inherit', textDecoration:'none' }}>Inicio</a>
          <span style={{ margin:'0 4px' }}>/</span>
          <a href="/#servicios" style={{ color:'inherit', textDecoration:'none' }}>Servicios</a>
          <span style={{ margin:'0 4px' }}>/</span>
          <span style={{ color:'rgba(255,255,255,.75)' }}>{s.tituloCorto}</span>
        </nav>
        {s.hero?.eyebrow && <div className="section-badge" style={{ marginBottom:'1rem' }}>{s.hero.eyebrow}</div>}
        <h1 style={{ color:'#fff', marginBottom:'1.25rem', maxWidth:700, fontSize:'clamp(1.75rem,5vw,3.25rem)' }} dangerouslySetInnerHTML={{ __html: s.hero?.h1||s.tituloCorto }} />
        {s.hero?.descripcion && <p style={{ color:'rgba(255,255,255,.75)', fontSize:'clamp(0.95rem,2.5vw,1.1rem)', maxWidth:580, marginBottom:'2rem', lineHeight:1.75 }}>{s.hero.descripcion}</p>}
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.875rem' }}>
          <a href="/contacto" className="btn btn--gold">Cotizar Ahora</a>
          <a href={`https://wa.me/51945203708?text=Hola, me interesa ${s.tituloCorto}`} target="_blank" rel="noopener noreferrer" className="btn btn--outline">💬 WhatsApp</a>
        </div>
      </div>
    </section>
  );
}
