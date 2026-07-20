'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { cxCard, cxFull, cxVideo, cxShareVideo } from '@/lib/cloudinary';
import { ShareBar } from '@/components/ui/ShareBar';
import CustomVideoPlayer from '@/components/ui/CustomVideoPlayer';
import { useLockBodyScroll } from '@/lib/hooks/useLockBodyScroll';
import { useIsTouchDevice } from '@/lib/hooks/useIsTouchDevice';
import { useZoomPan } from '@/lib/hooks/useZoomPan';
import type { AlbumFoto } from '@/types';

const isVideo = (item: AlbumFoto) =>
  item.tipo === 'video' || !!item.url?.match(/\.(mp4|webm|mov)(\?|$)/i);

export default function AlbumDetailClient({ fotos }: { fotos: AlbumFoto[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const isTouch = useIsTouchDevice();
  const mediaBoxRef = useRef<HTMLDivElement>(null);
  const { scale: imgScale, x: imgX, y: imgY, handlers: imgZoomHandlers } = useZoomPan(mediaBoxRef);

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
                <Image src={cxCard(item.url)} alt={item.alt || `Foto del álbum ${i + 1}`}
                  width={700} height={700}
                  sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
                  priority={i < 6}
                  style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover', objectPosition: fp }} />
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
          justifyContent: 'center',
          padding: isTouch ? 0 : '16px 16px 12px',
          cursor: 'zoom-out',
        }} onClick={() => setLightbox(null)}>

          <button onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, right: 16, width: 40, height: 40,
              borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none',
              color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 2,
            }}>
            ✕
          </button>

          <div onClick={e => e.stopPropagation()}
            style={isTouch ? {
              width: '100%', height: '100%', cursor: 'default', position: 'relative',
              animation: 'albumLbIn .3s cubic-bezier(0.34,1.56,0.64,1)',
            } : {
              maxWidth: 960, width: '100%', cursor: 'default', display: 'flex',
              flexDirection: 'column', gap: 10,
              animation: 'albumLbIn .3s cubic-bezier(0.34,1.56,0.64,1)',
            }}>

            <div ref={mediaBoxRef} style={isTouch ? {
              position: 'absolute', inset: 0, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            } : { position: 'relative' }}>
              {isVideo(fotos[lightbox]) ? (
                <CustomVideoPlayer key={fotos[lightbox].id} src={fotos[lightbox].url} sonidoPermitido={fotos[lightbox].sonidoPermitido === true} fullBleed={isTouch} />
              ) : (
                <motion.div
                  {...(isTouch ? imgZoomHandlers : {})}
                  style={{
                    scale: isTouch ? imgScale : 1,
                    x: isTouch ? imgX : 0,
                    y: isTouch ? imgY : 0,
                    touchAction: isTouch ? 'none' : 'auto',
                    ...(isTouch ? {
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    } : {}),
                  }}
                >
                  <Image src={cxFull(fotos[lightbox].url)}
                    alt={fotos[lightbox].alt || 'Foto del evento'}
                    width={1400} height={900}
                    sizes={isTouch ? '100vw' : '(max-width: 960px) 95vw, 960px'}
                    style={isTouch ? {
                      width: '100%', height: '100%', maxHeight: '100dvh',
                      objectFit: 'contain', display: 'block',
                    } : {
                      width: '100%', height: 'auto', maxHeight: '72vh', objectFit: 'contain', display: 'block',
                      borderRadius: 16, boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                    }} />
                </motion.div>
              )}
            </div>

            {isTouch ? (
              /* Overlay flotante estilo X/Twitter: info + acciones superpuestas sobre el medio, sin robarle alto */
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2,
                display: 'flex', flexDirection: 'column', gap: 8,
                padding: '28px 16px 12px',
                background: 'linear-gradient(transparent, rgba(5,13,26,0.85) 45%)',
                pointerEvents: 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0, pointerEvents: 'auto' }}>
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

                <div style={{ pointerEvents: 'auto' }}>
                  <ShareBar
                    itemId={fotos[lightbox].id}
                    title={fotos[lightbox].alt}
                    {...(isVideo(fotos[lightbox])
                      ? { videoUrl: cxShareVideo(fotos[lightbox].url) }
                      : { imageUrl: cxFull(fotos[lightbox].url) })}
                  />
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
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
