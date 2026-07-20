'use client';
import Image from 'next/image';

const DEFAULT_BRANDS = [
  { name:'Telecable Smart',   logo:'📡' },
  { name:'Komatsu',           logo:'⚙️'  },
  { name:'Misky Mayo',        logo:'🌿' },
  { name:'Salón El Paraíso',  logo:'🏛️' },
  { name:'Luminex',           logo:'💡' },
  { name:'Quavii',            logo:'🎯' },
];

export default function BrandsSection({ data }: { data: any }) {
  const raw    = data?.brands?.length ? data.brands : DEFAULT_BRANDS;
  const brands = raw.filter((b: any) => b.visible !== false);
  const h2     = data?.h2 || 'Empresas que confían en nosotros';

  if (!brands.length) return null;

  return (
    <section style={{ padding:'4rem 0', background:'#f8fafc',
                       borderTop:'1px solid #e2e8f0', borderBottom:'1px solid #e2e8f0',
                       position:'relative', overflow:'hidden' }}>
      <div className="container">
        <div className="reveal" style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <p style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.14em', color:'#94a3b8' }}>
            {h2}
          </p>
        </div>

        {/* Carrusel infinito (marquee) — se pausa al pasar el cursor */}
        <div className="brands-marquee"
             style={{ overflow:'hidden',
                       maskImage:'linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)',
                       WebkitMaskImage:'linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)' }}>
          <div className="brands-track" style={{ display:'flex', width:'max-content' }}>
            {Array.from({ length: 6 }).flatMap((_, rep) =>
              brands.map((b: any, i: number) => (
                <div key={`${rep}-${i}`}
                     aria-hidden={rep > 0}
                     style={{ display:'flex', alignItems:'center', gap:10, padding:'0.8rem 1.75rem',
                               marginRight:'1.25rem', minWidth:170, justifyContent:'center',
                               borderRadius:14, background:'#fff', border:'1px solid #e2e8f0',
                               whiteSpace:'nowrap', boxShadow:'0 2px 8px rgba(10,22,40,0.05)',
                               transition:'all .35s cubic-bezier(0.23,1,0.32,1)', cursor:'default' }}
                     onMouseEnter={e => {
                       const el = e.currentTarget as HTMLElement;
                       el.style.borderColor = 'rgba(212,160,23,0.5)';
                       el.style.transform   = 'translateY(-5px)';
                       el.style.boxShadow   = '0 12px 28px rgba(10,22,40,0.12)';
                       el.style.background  = 'linear-gradient(135deg,rgba(212,160,23,0.05),#fff)';
                     }}
                     onMouseLeave={e => {
                       const el = e.currentTarget as HTMLElement;
                       el.style.borderColor = '#e2e8f0';
                       el.style.transform   = 'translateY(0)';
                       el.style.boxShadow   = '0 2px 8px rgba(10,22,40,0.05)';
                       el.style.background  = '#fff';
                     }}>
                  {b.logoUrl
                    ? <Image src={b.logoUrl} alt={b.name} width={40} height={40} style={{ width:40, height:40, objectFit:'contain' }}/>
                    : b.logo && b.logo.length <= 4
                      ? <span style={{ fontSize:'1.4rem' }}>{b.logo}</span>
                      : b.logo && <Image src={b.logo} alt={b.name} width={40} height={40} style={{ width:40, height:40, objectFit:'contain' }}/>
                  }
                  <span style={{ fontSize:'0.88rem', fontWeight:600, color:'#475569' }}>{b.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        .brands-track { animation: brandsMarquee 32s linear infinite; }
        .brands-marquee:hover .brands-track { animation-play-state: paused; }
        @keyframes brandsMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .brands-track { animation: none; flex-wrap: wrap; width: auto !important; justify-content: center; }
        }
      `}</style>
    </section>
  );
}
