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
    <section style={{ padding:'5.5rem 0 4rem', background:'linear-gradient(180deg,#0a1628 0%,#050d1a 100%)',
                       borderBottom:'1px solid rgba(212,160,23,0.12)',
                       position:'relative', overflow:'hidden' }}>
      <div style={{ textAlign:'center', marginBottom:'2.5rem', padding:'0 1rem' }}>
        <p style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.22em', color:'rgba(255,255,255,0.45)' }}>
          {h2}
        </p>
      </div>

      {/* Carrusel infinito (marquee) a ancho completo — se pausa al pasar el cursor */}
      <div className="brands-marquee" style={{ overflow:'hidden', width:'100%' }}>
        <div className="brands-track" style={{ display:'flex', width:'max-content' }}>
            {Array.from({ length: 6 }).flatMap((_, rep) =>
              brands.map((b: any, i: number) => (
                <div key={`${rep}-${i}`}
                     aria-hidden={rep > 0}
                     style={{ display:'flex', alignItems:'center', gap:10, padding:'0.8rem 1.75rem',
                               marginRight:'1.25rem', minWidth:170, justifyContent:'center',
                               borderRadius:14, background:'#fff', border:'1px solid #e2e8f0',
                               whiteSpace:'nowrap', boxShadow:'0 2px 8px rgba(10,22,40,0.05)',
                               cursor:'default' }}>
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

      <style>{`
        .brands-track { animation: brandsMarquee 45s linear infinite; }
        @keyframes brandsMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
