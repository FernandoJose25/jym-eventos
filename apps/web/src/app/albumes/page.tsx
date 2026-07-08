import type { Metadata } from 'next';
import Link from 'next/link';
import { adminDb } from '@/lib/firebase-admin';
import { SITE_URL } from '@/lib/site';
import { getAlbumesVisibles } from '@/lib/albums';
import { cxCard } from '@/lib/cloudinary';

// ISR: la página se sirve desde caché estático y se regenera en segundo
// plano como máximo cada hora — no pega a Firestore en cada visita.
export const revalidate = 3600;

const DEFAULT_TITLE = 'Álbumes de Eventos';
const DEFAULT_DESC = 'Explora los eventos reales que hemos organizado: cumpleaños, quinceañeros, activaciones corporativas y más, en Sechura, Piura.';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const snap = await adminDb.collection('site_config').doc('seo').get();
    const data = snap.exists ? snap.data() ?? {} : {};
    return {
      title: data.albumesTitle || DEFAULT_TITLE,
      description: data.albumesDesc || DEFAULT_DESC,
      alternates: { canonical: `${SITE_URL}/albumes` },
    };
  } catch {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      alternates: { canonical: `${SITE_URL}/albumes` },
    };
  }
}

function fmtFecha(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function Page() {
  const albumes = await getAlbumesVisibles();

  return (
    <>
      {/* Hero */}
      <section style={{
        paddingTop: '8rem', paddingBottom: '4rem',
        background: 'linear-gradient(135deg,#050d1a 0%,#0a1628 50%,#1e3a5f 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {[600, 400, 240].map(s => (
          <div key={s} style={{
            position: 'absolute', top: '50%', left: '50%', width: s, height: s,
            borderRadius: '50%', border: '1px solid rgba(212,160,23,0.07)',
            transform: 'translate(-50%,-50%)', pointerEvents: 'none',
          }} />
        ))}
        <div className="container" style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <nav style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: 16 }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Inicio</Link>{' / '}
            <span style={{ color: 'rgba(255,255,255,.75)' }}>Álbumes</span>
          </nav>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: '1rem',
            padding: '0.35rem 1.25rem', borderRadius: 9999,
            background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)',
            color: '#f5c842', fontSize: '0.72rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.12em',
          }}>
            🎉 Eventos Reales
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem,5vw,3.5rem)', marginBottom: '1rem' }}>
            Álbumes de <em>Eventos</em>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', maxWidth: 560, margin: '0 auto' }}>
            Cada celebración que organizamos, contada en fotos. Elige un álbum y revive el momento.
          </p>
        </div>
      </section>

      {/* Grid de álbumes */}
      <section style={{ padding: '4rem 0 5rem', background: '#f8fafc', minHeight: '50vh' }}>
        <div className="container">
          {albumes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <p style={{ fontSize: '3rem', marginBottom: 12 }}>📷</p>
              <p style={{ color: '#64748b', fontSize: '1rem' }}>
                Aún no hay álbumes publicados. Muy pronto verás aquí nuestros eventos.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid', gap: '1.75rem',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            }}>
              {albumes.map(album => (
                <Link
                  key={album.id}
                  href={`/albumes/${album.slug}`}
                  className="album-card"
                  style={{
                    display: 'block', borderRadius: 18, overflow: 'hidden', textDecoration: 'none',
                    position: 'relative', aspectRatio: '4 / 5', background: '#0a1628',
                    boxShadow: '0 6px 20px rgba(10,22,40,0.12)',
                  }}
                >
                  {album.coverUrl && (
                    <img
                      src={cxCard(album.coverUrl)}
                      alt={album.titulo}
                      loading="lazy"
                      decoding="async"
                      style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%',
                        objectFit: 'cover',
                        objectPosition: `${(album.coverFocalX ?? 0.5) * 100}% ${(album.coverFocalY ?? 0.5) * 100}%`,
                      }}
                    />
                  )}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(10,22,40,0.92) 0%, rgba(10,22,40,0.15) 55%, transparent 100%)',
                  }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.25rem' }}>
                    {album.tipoEvento && (
                      <span style={{
                        display: 'inline-block', background: 'rgba(212,160,23,0.9)', color: '#0a1628',
                        fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                        textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8,
                      }}>
                        {album.tipoEvento}
                      </span>
                    )}
                    <h2 style={{ color: '#fff', fontSize: '1.15rem', margin: 0, lineHeight: 1.25 }}>
                      {album.titulo}
                    </h2>
                    {album.fecha && (
                      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', margin: '4px 0 0' }}>
                        {fmtFecha(album.fecha)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <style>{`
        .album-card { transition: transform .3s, box-shadow .3s; }
        .album-card:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(10,22,40,0.22); }
        .album-card img { transition: transform .5s; }
        .album-card:hover img { transform: scale(1.04); }
      `}</style>
    </>
  );
}
