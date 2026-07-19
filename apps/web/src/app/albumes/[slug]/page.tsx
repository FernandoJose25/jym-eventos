import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/site';
import { getAlbumBySlug, getAllAlbumSlugs, getFotosDeAlbum } from '@/lib/albums';
import { cxHero, cxOg } from '@/lib/cloudinary';
import JsonLd from '@/components/ui/JsonLd';
import AlbumDetailClient from './AlbumDetailClient';

// ISR: cada álbum se sirve pre-generado y se revalida como máximo cada hora.
// Los álbumes nuevos (creados después del build) se generan on-demand la
// primera vez que alguien los visita y luego quedan cacheados igual.
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllAlbumSlugs();
  return slugs.map(slug => ({ slug }));
}

function fmtFecha(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const album = await getAlbumBySlug(slug);
  const canonical = `${SITE_URL}/albumes/${slug}`;

  if (!album) {
    return {
      title: 'Álbum no encontrado',
      description: 'El álbum que buscas no está disponible.',
      alternates: { canonical },
    };
  }

  const title = `${album.titulo}${album.tipoEvento ? ` — ${album.tipoEvento}` : ''}`;
  const desc = album.descripcion
    || `Fotos y videos reales de "${album.titulo}", un evento organizado por J&M Decoraciones y Eventos en Sechura, Piura.`;

  return {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: `${title} | J&M Decoraciones y Eventos`,
      description: desc,
      url: canonical,
      images: album.coverUrl ? [{ url: cxOg(album.coverUrl), width: 1200, height: 630 }] : undefined,
    },
  };
}

export default async function Page(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const album = await getAlbumBySlug(slug);
  if (!album) notFound();

  const fotos = await getFotosDeAlbum(album.id);
  const canonical = `${SITE_URL}/albumes/${album.slug}`;

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'ImageGallery',
        name: album.titulo,
        description: album.descripcion || `Fotos del evento ${album.titulo}`,
        url: canonical,
        ...(album.coverUrl ? { image: cxOg(album.coverUrl) } : {}),
        ...(album.fecha ? { datePublished: album.fecha } : {}),
      }} />

      {/* Hero */}
      <section style={{
        paddingTop: '8rem', paddingBottom: '3.5rem',
        background: 'linear-gradient(135deg,#050d1a 0%,#0a1628 50%,#1e3a5f 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {album.coverUrl && (
          <img
            src={cxHero(album.coverUrl)}
            alt=""
            aria-hidden
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', opacity: 0.55,
              objectPosition: `${(album.coverFocalX ?? 0.5) * 100}% ${(album.coverFocalY ?? 0.5) * 100}%`,
            }}
          />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(5,13,26,0.4) 0%, rgba(10,22,40,0.5) 60%, rgba(30,58,95,0.55) 100%)',
        }} />
        <div className="container" style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <nav style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: 16 }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Inicio</Link>{' / '}
            <Link href="/albumes" style={{ color: 'inherit', textDecoration: 'none' }}>Álbumes</Link>{' / '}
            <span style={{ color: 'rgba(255,255,255,.75)' }}>{album.titulo}</span>
          </nav>
          {album.tipoEvento && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: '1rem',
              padding: '0.35rem 1.25rem', borderRadius: 9999,
              background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)',
              color: '#f5c842', fontSize: '0.72rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.12em',
            }}>
              {album.tipoEvento}
            </div>
          )}
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem,5vw,3.5rem)', marginBottom: '0.75rem' }}>
            {album.titulo}
          </h1>
          {(album.fecha || album.cliente) && (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', marginBottom: album.descripcion ? '1rem' : 0 }}>
              {fmtFecha(album.fecha)}{album.fecha && album.cliente ? ' · ' : ''}{album.cliente}
            </p>
          )}
          {album.descripcion && (
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', maxWidth: 620, margin: '0 auto' }}>
              {album.descripcion}
            </p>
          )}
        </div>
      </section>

      {/* Grid de fotos del álbum */}
      <section style={{ padding: '3rem 0 5rem', background: '#f8fafc', minHeight: '50vh' }}>
        <div className="container">
          {fotos.length > 0 && (
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '1.5rem', textAlign: 'right' }}>
              {fotos.length} elemento{fotos.length !== 1 ? 's' : ''} en este álbum
            </p>
          )}
          <AlbumDetailClient fotos={fotos} />
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '4rem 0', background: 'linear-gradient(135deg,#0a1628,#1e3a5f)', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ color: '#fff', marginBottom: '1rem' }}>¿Te gustó lo que viste?</h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', marginBottom: '2rem', fontSize: '1.05rem' }}>
            Tu evento puede ser el próximo. Contáctanos y lo hacemos realidad.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/contacto"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '1rem 2rem',
                borderRadius: 9999, background: 'linear-gradient(135deg,#b8860b,#f5c842)',
                color: '#0a1628', fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(212,160,23,0.4)',
              }}>
              Solicitar Cotización
            </Link>
            <Link href="/albumes"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '1rem 2rem',
                borderRadius: 9999, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff', fontWeight: 700, textDecoration: 'none',
              }}>
              Ver otros álbumes
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
