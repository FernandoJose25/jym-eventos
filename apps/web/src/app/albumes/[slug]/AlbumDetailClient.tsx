'use client';
import { useState, useEffect } from 'react';
import { cxCard, cxFull, cxVideo, cxShareVideo } from '@/lib/cloudinary';
import { ShareBar } from '@/components/ui/ShareBar';
import CustomVideoPlayer from '@/components/ui/CustomVideoPlayer';
import { useLockBodyScroll } from '@/lib/hooks/useLockBodyScroll';
import type { AlbumFoto } from '@/types';

const isVideo = (item: AlbumFoto) =>
  item.tipo === 'video' || !!item.url?.match(/\.(mp4|webm|mov)(\?|$)/i);

export default function AlbumDetailClient({ fotos }: { fotos: AlbumFoto[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  useLockBodyScroll(lightbox !== null);

  useEffect(() => {
    if (lightbox === null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox(p => ((p! + 1) % fotos.length));
      if (e.key === 'ArrowLeft') setLightbox(p => ((p! - 1 + fotos.length) % fotos.length));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [lightbox, fotos.length]);

  if (fotos.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '4.5rem 2rem', borderRadius: 20,
        background: 'linear-gradient(135deg,#f8fafc,#eef2f7)',
        border: '1px dashed #cbd5e1',
      }}>
        <p style={{ fontSize: '3rem', marginBottom: 14 }}>✨</p>
        <p style={{ color: '#1e293b', fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>
          Próximamente más fotos
        </p>
        <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: 420, margin: '0 auto' }}>
          Estamos preparando el material de este evento. Vuelve pronto para ver las fotos y videos.
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ columns: '3 220px', gap: '1.25rem' }}>
        {fotos.map((item, i) => {
          const fp = `${(item.focalX ?? 0.5) * 100}% ${(item.focalY ?? 0.5) * 100}%`;
          const vid = isVideo(item);
          return (
            <div
              key={item.id}
              onClick={() => setLightbox(i)}
              className="album-item"
              style={{
                breakInside: 'avoid', marginBottom: '1.25rem', borderRadius: 16,
                overflow: 'hidden', cursor: 'pointer', position: 'relative',
                boxShadow: '0 4px 16px rgba(10,22,40,0.1)', background: '#0a1628',
              }}
            >
              {vid ? (
                <video key={item.url} src={cxVideo(item.url)} muted playsInline preload="metadata"
                  style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: fp }} />
              ) : (
                <img src={cxCard(item.url)} alt={item.alt || `Foto del álbum ${i + 1}`}
                  loading={i < 6 ? 'eager' : 'lazy'}
                  decoding="async"
                  style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: fp }} />
              )}
              {vid && (
                <div style={{
                  position: 'absolute', top: 10, left: 10, background: 'rgba(10,22,40,0.82)',
                  color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                  padding: '3px 9px', borderRadius: 999, pointerEvents: 'none',
                }}>
                  🎬 Video
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox !== null && fotos[lightbox] && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(5,13,26,0.96)',
          backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '16px 16px 12px', cursor: 'zoom-out',
        }} onClick={() => setLightbox(null)}>

          <button onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, right: 16, width: 40, height: 40,
              borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none',
              color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 1,
            }}>
            ✕
          </button>

          <div onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 960, width: '100%', cursor: 'default', display: 'flex',
              flexDirection: 'column', gap: 10,
              animation: 'albumLbIn .3s cubic-bezier(0.34,1.56,0.64,1)',
            }}>

            {isVideo(fotos[lightbox]) ? (
              <CustomVideoPlayer key={fotos[lightbox].id} src={fotos[lightbox].url} sonidoPermitido={fotos[lightbox].sonidoPermitido === true} />
            ) : (
              <img src={cxFull(fotos[lightbox].url)}
                alt={fotos[lightbox].alt || 'Foto del evento'}
                decoding="async"
                style={{
                  width: '100%', maxHeight: '72vh', objectFit: 'contain', display: 'block',
                  borderRadius: 16, boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                }} />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={e => { e.stopPropagation(); setLightbox(p => ((p! - 1 + fotos.length) % fotos.length)); }}
                style={{
                  flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                ←
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                {fotos[lightbox].alt && (
                  <p style={{
                    color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', margin: '2px 0 0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {fotos[lightbox].alt}
                  </p>
                )}
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', margin: '2px 0 0' }}>
                  {lightbox + 1} / {fotos.length}
                </p>
              </div>

              <button onClick={e => { e.stopPropagation(); setLightbox(p => ((p! + 1) % fotos.length)); }}
                style={{
                  flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                →
              </button>
            </div>

            <ShareBar
              itemId={fotos[lightbox].id}
              title={fotos[lightbox].alt}
              {...(isVideo(fotos[lightbox])
                ? { videoUrl: cxShareVideo(fotos[lightbox].url) }
                : { imageUrl: cxFull(fotos[lightbox].url) })}
            />
          </div>
        </div>
      )}

      <style>{`
        .album-item { transition: transform .3s, box-shadow .3s; }
        .album-item:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 12px 32px rgba(10,22,40,0.2); }
        @keyframes albumLbIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        @media(max-width:768px){ div[style*="columns:3"] { columns: 2 180px !important; gap:0.875rem !important; } }
        @media(max-width:480px){ div[style*="columns:3"], div[style*="columns:2"] { columns: 1 !important; } }
      `}</style>
    </>
  );
}
