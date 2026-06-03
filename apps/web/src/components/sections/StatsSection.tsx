'use client';
import { useEffect, useRef, useState } from 'react';

function useCountUp(target: number, duration = 2200, started: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!started || target===0) return;
    const start = Date.now();
    const tick = () => {
      const elapsed  = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, started]);
  return value;
}

function parseNum(str: string = '') {
  const m = str.match(/^([^0-9]*)([0-9]+)([^0-9]*)$/);
  return m ? { prefix:m[1], num:parseInt(m[2]), suffix:m[3] } : { prefix:'', num:0, suffix:str };
}

function Stat({ prefix, num, suffix, label, sub, started, idx }:
  { prefix:string; num:number; suffix:string; label:string; sub?:string; started:boolean; idx:number }) {
  const displayed = useCountUp(num, 2200, started);
  return (
    <div className={`reveal stagger-${idx+1}`} style={{ textAlign:'center' }}>
      <p className="stat-number"
         style={{ fontFamily:'var(--font-playfair)', fontSize:'clamp(2.25rem,4vw,3.25rem)',
                   fontWeight:700, color:'#f5c842', margin:'0 0 6px', lineHeight:1 }}>
        {prefix}{started ? displayed : 0}{suffix}
      </p>
      <p style={{ color:'#fff', fontWeight:600, fontSize:'0.95rem', margin:'0 0 4px' }}>{label}</p>
      {sub && <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.75rem' }}>{sub}</p>}
    </div>
  );
}

export default function StatsSection({ data }: { data: Record<string,any> }) {
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStarted(true); obs.disconnect(); }
    }, { threshold:0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const items = [
    { num:data?.s1num||'+500', label:data?.s1label||'Fiestas exitosas',       sub:data?.s1sub||'Celebraciones realizadas' },
    { num:data?.s2num||'10+',  label:data?.s2label||'Años de experiencia',    sub:data?.s2sub||'Creando sonrisas' },
    { num:data?.s3num||'100%', label:data?.s3label||'Diversión garantizada',  sub:data?.s3sub||'En cada evento' },
    { num:data?.s4num||'6',    label:data?.s4label||'Servicios disponibles',  sub:data?.s4sub||'Todo en un solo lugar' },
  ];

  return (
    <section ref={ref}
             style={{ padding:'5rem 0', background:'linear-gradient(135deg,#050d1a 0%,#0a1628 50%,#1e3a5f 100%)',
                       position:'relative', overflow:'hidden' }}>
      {/* Anillos flotantes decorativos */}
      {[700,500,320].map((s,i) => (
        <div key={s} className="breathe-subtle"
             style={{ position:'absolute', top:'50%', left:'50%', width:s, height:s, borderRadius:'50%',
                       border:'1px solid rgba(212,160,23,0.06)', transform:'translate(-50%,-50%)',
                       pointerEvents:'none', animationDelay:`${i*1.2}s` }}/>
      ))}

      <div className="container">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'2rem' }}
             className="stats-grid">
          {items.map((item, i) => {
            const parsed = parseNum(item.num);
            return (
              <Stat key={i} {...parsed} label={item.label} sub={item.sub}
                    started={started} idx={i}/>
            );
          })}
        </div>
      </div>

      <style>{`
        @media(max-width:768px){ .stats-grid{ grid-template-columns:1fr 1fr !important; row-gap:2rem !important; } }
        @media(max-width:380px){ .stats-grid{ grid-template-columns:1fr 1fr !important; gap:1.25rem !important; } }
        @media(max-width:380px){ .stat-number{ font-size:2rem !important; } }
      `}</style>
    </section>
  );
}
