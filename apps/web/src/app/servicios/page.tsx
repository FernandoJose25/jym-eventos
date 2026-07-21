import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { adminDb } from '@/lib/firebase-admin';
import { SITE_URL } from '@/lib/site';
import JsonLd from '@/components/ui/JsonLd';

const toSlugUrl = (link: string) => {
  if (!link) return '/contacto';
  return '/servicios/' + link.replace('servicios/', '').replace('.html', '');
};

async function getServices() {
  try {
    const snap = await adminDb.collection('services').where('visible', '==', true).orderBy('order', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as {
      id: string; title: string; icon: string; desc?: string; link: string;
      mediaSrc?: string; mediaType?: string;
    }[];
  } catch {
    return [];
  }
}

export const dynamic = 'force-dynamic';

const TITLE = 'Nuestros Servicios para Eventos';
const DESC = 'Shows infantiles, hora loca, activaciones empresariales, catering, decoración temática, quinceaños, bodas y más. Cotiza gratis con J&M Decoraciones y Eventos en Sechura, Piura.';

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${SITE_URL}/servicios`;
  return {
    title: `${TITLE} | J&M Decoraciones y Eventos`,
    description: DESC,
    alternates: { canonical },
    openGraph: {
      title: TITLE,
      description: DESC,
      url: canonical,
    },
  };
}

export default async function ServiciosPage() {
  const services = await getServices();
  const canonical = `${SITE_URL}/servicios`;

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: services.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.title,
      url: `${SITE_URL}${toSlugUrl(s.link)}`,
    })),
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg,#050d1a 0%,#0a1628 45%,#0d1f3c 100%)',
        padding: '10rem 0 6rem',
        minHeight: '100vh',
      }}>
        <div style={{
          position: 'absolute', top: -200, right: -200, width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(212,160,23,0.08) 0%,transparent 70%)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -150, left: -150, width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(37,99,235,0.08) 0%,transparent 70%)', pointerEvents: 'none',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: '1rem',
              padding: '0.4rem 1.5rem', borderRadius: 9999,
              background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.25)',
              color: '#f5c842', fontSize: '0.75rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.12em',
            }}>
              🎭 Nuestros Servicios
            </span>
            <h1 style={{ color: '#fff', marginBottom: '1rem', fontSize: 'clamp(2.25rem,4.5vw,3.75rem)' }}>
              Todo lo que necesitas para tu{' '}
              <em style={{ color: '#d4a017', fontStyle: 'italic' }}>evento perfecto</em>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.05rem', maxWidth: 560, margin: '0 auto' }}>
              Desde la decoración hasta el entretenimiento — lo organizamos todo en Sechura, Piura.
            </p>
          </div>

          {services.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              Estamos actualizando nuestros servicios. Escríbenos por WhatsApp para más información.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.75rem' }} className="srv-list-grid">
              {services.map(s => {
                const isVideo = s.mediaType === 'video' || !!s.mediaSrc?.match(/\.(mp4|webm|mov)/i);
                const photo = !isVideo ? s.mediaSrc : undefined;
                return (
                <Link key={s.id} href={toSlugUrl(s.link)} style={{
                  textDecoration: 'none', display: 'block', borderRadius: 20, padding: '1.75rem',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)', transition: 'all .3s cubic-bezier(0.23,1,0.32,1)',
                  position: 'relative', overflow: 'hidden', isolation: 'isolate',
                }}
                  className="srv-list-card"
                >
                  {/* Foto real del servicio: emerge al hover (desktop) con velo navy para
                      mantener legible el texto. Lazy: solo se descarga al acercarse al viewport. */}
                  {photo && (
                    <div className="srv-list-photo" aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
                      <Image src={photo} alt="" fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                        style={{ objectFit: 'cover' }} />
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, rgba(10,22,40,0.94) 25%, rgba(10,22,40,0.55) 70%, rgba(10,22,40,0.35))',
                      }} />
                    </div>
                  )}
                  <div className="srv-list-med" style={{
                    width: 56, height: 56, borderRadius: 14, marginBottom: '1.1rem',
                    background: 'linear-gradient(135deg,rgba(212,160,23,0.2),rgba(212,160,23,0.06))',
                    border: '1px solid rgba(212,160,23,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem',
                    transition: 'transform .4s cubic-bezier(.16,1,.3,1)',
                  }}>
                    {s.icon}
                  </div>
                  <h2 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>{s.title}</h2>
                  {s.desc && (
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
                      {s.desc.slice(0, 100)}{s.desc.length > 100 ? '…' : ''}
                    </p>
                  )}
                  <span className="srv-list-more" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    color: '#f5c842', fontSize: '0.82rem', fontWeight: 700,
                  }}>
                    Ver más <span className="srv-list-arrow" style={{ transition: 'transform .3s cubic-bezier(.16,1,.3,1)', display: 'inline-block' }}>→</span>
                  </span>
                </Link>
                );
              })}
            </div>
          )}
        </div>

        <style>{`
          .srv-list-card:hover {
            border-color: rgba(212,160,23,0.45) !important;
            background: rgba(212,160,23,0.06) !important;
            transform: translateY(-4px);
          }
          /* Foto del servicio: oculta en reposo, emerge con zoom suave al hover */
          .srv-list-photo { opacity: 0; transform: scale(1.08); transition: opacity .5s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1); }
          .srv-list-card:hover .srv-list-photo { opacity: 1; transform: scale(1); }
          .srv-list-card:hover .srv-list-med { transform: rotate(-8deg) scale(1.08); }
          .srv-list-card:hover .srv-list-arrow { transform: translateX(5px); }
          @media(max-width:900px){ .srv-list-grid{ grid-template-columns:1fr 1fr !important; } }
          @media(max-width:600px){
            .srv-list-grid{ grid-template-columns:1fr !important; }
            /* En móvil no hay hover: la foto se muestra siempre, tenue bajo el velo */
            .srv-list-photo { opacity: 1; transform: scale(1); }
          }
          @media (prefers-reduced-motion: reduce) {
            .srv-list-photo, .srv-list-med, .srv-list-arrow { transition: none !important; }
          }
        `}</style>
      </section>
    </>
  );
}
