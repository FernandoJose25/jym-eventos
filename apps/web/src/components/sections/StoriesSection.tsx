'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import DividerJM from '@/components/ui/DividerJM';
import { cxVideo } from '@/lib/cloudinary';

/* Historias estilo Instagram: una fila de círculos con aro dorado, uno por
   historia curada a mano en el panel admin (Historias Instagram). Al tocar
   uno se abre un visor a pantalla completa que reproduce en secuencia las
   fotos/videos de esa historia, con barra de progreso automática (patrón que
   todo el mundo ya sabe usar). Termina, como todo, en WhatsApp. */

interface GItem {
  id: string; url: string; alt?: string;
  categoria?: string; focalX?: number; focalY?: number; tipo?: string;
}

interface StoryDoc {
  id: string; titulo: string; emoji?: string; visible?: boolean;
  items?: { galleryItemId: string }[];
}

const STORY_MS_FOTO = 3500; // duración por foto
const STORY_MS_VIDEO_MAX = 15000; // tope por si un video no reporta su duración

interface Grupo { categoria: string; emoji: string; fotos: GItem[] }

export default function StoriesSection({ items = [], stories = [] }: { items?: GItem[]; stories?: StoryDoc[] }) {
  const galeriaPorId = useMemo(() => {
    const map = new Map<string, GItem>();
    for (const it of items) map.set(it.id, it);
    return map;
  }, [items]);

  // Resuelve cada historia curada contra los items reales de la galería,
  // preservando el orden manual definido en el admin.
  const grupos = useMemo<Grupo[]>(() => {
    return stories
      .filter(s => s.visible !== false && (s.items?.length ?? 0) > 0)
      .map(s => ({
        categoria: s.titulo,
        emoji: s.emoji || '✨',
        fotos: (s.items || [])
          .map(ref => galeriaPorId.get(ref.galleryItemId))
          .filter((g): g is GItem => !!g?.url),
      }))
      .filter(g => g.fotos.length > 0);
  }, [stories, galeriaPorId]);

  const [openGrupo, setOpenGrupo] = useState<number | null>(null);
  const [foto, setFoto] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const actualEsVideo = (it?: GItem) => it?.tipo === 'video';

  // Avance automático: fotos usan tiempo fijo, videos avanzan cuando terminan
  // (o al tope de seguridad si el evento 'ended' no llega).
  useEffect(() => {
    if (openGrupo === null) return;
    const g = grupos[openGrupo];
    if (!g) return;
    const actual = g.fotos[foto];
    if (timer.current) clearTimeout(timer.current);
    if (actualEsVideo(actual)) {
      timer.current = setTimeout(() => next(), STORY_MS_VIDEO_MAX);
    } else {
      timer.current = setTimeout(() => {
        setFoto(f => {
          if (f + 1 < g.fotos.length) return f + 1;
          if (openGrupo + 1 < grupos.length) { setOpenGrupo(openGrupo + 1); return 0; }
          setOpenGrupo(null);
          return 0;
        });
      }, STORY_MS_FOTO);
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openGrupo, foto, grupos]);

  // Bloquea el scroll del fondo mientras el visor está abierto
  useEffect(() => {
    if (openGrupo === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [openGrupo]);

  // Teclado
  useEffect(() => {
    if (openGrupo === null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenGrupo(null);
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openGrupo, foto]);

  const abrir = (i: number) => { setOpenGrupo(i); setFoto(0); };
  const cerrar = () => setOpenGrupo(null);
  const next = () => {
    const g = openGrupo !== null ? grupos[openGrupo] : null;
    if (!g) return;
    if (foto + 1 < g.fotos.length) setFoto(foto + 1);
    else if (openGrupo! + 1 < grupos.length) { setOpenGrupo(openGrupo! + 1); setFoto(0); }
    else cerrar();
  };
  const prev = () => {
    if (foto > 0) setFoto(foto - 1);
    else if (openGrupo! - 1 >= 0) { const p = openGrupo! - 1; setOpenGrupo(p); setFoto(grupos[p].fotos.length - 1); }
  };

  if (grupos.length === 0) return null;

  const g = openGrupo !== null ? grupos[openGrupo] : null;
  const actual = g?.fotos[foto];

  return (
    <section style={{ padding: '4rem 0 3rem', background: '#0a1628', position: 'relative', overflow: 'hidden' }}>
      <div className="container" style={{ maxWidth: 820 }}>
        <DividerJM tone="dark" />

        <div className="reveal" style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem,3vw,2.1rem)' }}>
            Revive los <em style={{ color: '#f5c842', fontStyle: 'italic' }}>momentos</em>
          </h2>
        </div>

        {/* Fila de círculos */}
        <div className="reveal stories-row" style={{
          display: 'flex', gap: 18, overflowX: 'auto', paddingBottom: '0.5rem',
          justifyContent: 'flex-start', scrollbarWidth: 'none',
        }}>
          {grupos.map((gr, i) => (
            <button key={gr.categoria + i} onClick={() => abrir(i)}
              style={{
                flex: '0 0 auto', width: 76, textAlign: 'center', background: 'none',
                border: 'none', cursor: 'pointer', padding: 0,
              }}>
              <span style={{
                display: 'block', width: 68, height: 68, borderRadius: '50%', margin: '0 auto',
                padding: 3, background: 'conic-gradient(#b8860b,#f5c842,#b8860b)',
                transition: 'transform .3s cubic-bezier(.16,1,.3,1)',
              }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.07)')}
                onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                <span style={{
                  display: 'block', width: '100%', height: '100%', borderRadius: '50%',
                  border: '2px solid #0a1628', overflow: 'hidden', position: 'relative',
                }}>
                  {gr.fotos[0].tipo === 'video' ? (
                    <video src={cxVideo(gr.fotos[0].url)} muted playsInline preload="metadata"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Image src={gr.fotos[0].url} alt="" fill sizes="68px"
                      style={{
                        objectFit: 'cover',
                        objectPosition: `${(gr.fotos[0].focalX ?? 0.5) * 100}% ${(gr.fotos[0].focalY ?? 0.5) * 100}%`,
                      }} />
                  )}
                </span>
              </span>
              <span style={{
                display: 'block', marginTop: 6, fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)',
                fontFamily: 'var(--font-jakarta)', whiteSpace: 'nowrap', overflow: 'hidden',
                textOverflow: 'ellipsis', maxWidth: 76,
              }}>
                {gr.emoji} {gr.categoria}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Visor a pantalla completa */}
      {g && actual && (
        <div
          onClick={cerrar}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(5,13,26,0.97)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              position: 'relative', width: '100%', maxWidth: 440, height: '100%', maxHeight: '100dvh',
              display: 'flex', flexDirection: 'column',
              padding: 'calc(env(safe-area-inset-top) + 12px) 12px calc(env(safe-area-inset-bottom) + 12px)',
              boxSizing: 'border-box',
            }}>
            {/* Barras de progreso */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {g.fotos.map((_, i) => (
                <span key={i} style={{
                  flex: 1, height: 3, borderRadius: 9999, background: 'rgba(255,255,255,0.25)', overflow: 'hidden',
                }}>
                  <span style={{
                    display: 'block', height: '100%', borderRadius: 9999, background: '#f5c842',
                    width: i < foto ? '100%' : i === foto ? '100%' : '0%',
                    transformOrigin: 'left',
                    animation: i === foto && !actualEsVideo(actual) ? `storyBar ${STORY_MS_FOTO}ms linear forwards` : 'none',
                  }} />
                </span>
              ))}
            </div>

            {/* Cabecera */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font-jakarta)' }}>
                {g.emoji} {g.categoria}
              </span>
              <button onClick={cerrar} aria-label="Cerrar"
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {/* Foto o video */}
            <div style={{ position: 'relative', flex: 1, borderRadius: 16, overflow: 'hidden', background: '#050d1a' }}>
              {actualEsVideo(actual) ? (
                <video
                  key={actual.id}
                  ref={videoRef}
                  src={cxVideo(actual.url)}
                  autoPlay
                  muted
                  playsInline
                  onEnded={next}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    animation: 'storyImgIn .4s cubic-bezier(.16,1,.3,1)',
                  }} />
              ) : (
                <Image key={actual.id} src={actual.url} alt={actual.alt || `${g.categoria} · J&M`} fill
                  sizes="(max-width: 440px) 100vw, 440px"
                  style={{
                    objectFit: 'cover',
                    objectPosition: `${(actual.focalX ?? 0.5) * 100}% ${(actual.focalY ?? 0.5) * 100}%`,
                    animation: 'storyImgIn .4s cubic-bezier(.16,1,.3,1)',
                  }} />
              )}

              {/* Zonas de toque: izquierda = anterior, derecha = siguiente */}
              <button onClick={prev} aria-label="Anterior"
                style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%', background: 'none', border: 'none', cursor: 'pointer' }} />
              <button onClick={next} aria-label="Siguiente"
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%', background: 'none', border: 'none', cursor: 'pointer' }} />

              {actual.alt && (
                <p style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0, margin: 0,
                  padding: '2.5rem 1rem 1rem', color: '#fff', fontSize: '0.82rem',
                  background: 'linear-gradient(transparent, rgba(5,13,26,0.85))', pointerEvents: 'none',
                }}>{actual.alt}</p>
              )}
            </div>

            {/* CTA */}
            <a href="https://wa.me/51945203708?text=Hola%2C%20vi%20sus%20eventos%20y%20quiero%20cotizar"
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12,
                padding: '0.85rem', borderRadius: 9999, background: 'linear-gradient(135deg,#b8860b,#f5c842)',
                color: '#0a1628', fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none',
              }}>
              💬 Quiero un evento así
            </a>
          </div>
        </div>
      )}

      <style>{`
        @keyframes storyBar { from { width: 0%; } to { width: 100%; } }
        @keyframes storyImgIn { from { opacity: 0; transform: scale(1.04); } to { opacity: 1; transform: none; } }
        .stories-row::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) {
          [style*="storyBar"], [style*="storyImgIn"] { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
