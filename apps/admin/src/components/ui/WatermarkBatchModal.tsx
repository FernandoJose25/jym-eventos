'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadFile } from '@/lib/upload';
import { cxCard, cxVideo } from '@/lib/cloudinary';

const WATERMARK_LOGO_URL = '/logo-watermark.png';
const MAX_DIM = 1600;

interface Item { id: string; url: string; alt?: string; tipo?: string }

interface Props {
  items: Item[];
  onApplyOne: (id: string, newUrl: string) => Promise<void>;
  onClose: () => void;
}

const isVideo = (item: Item) => item.tipo === 'video';

/**
 * Aplica la marca de agua a varias fotos y videos ya publicados, uno por
 * uno, dejando que el usuario elija la posición del logo individualmente
 * (arrastrando) para no interferir con la composición de cada uno — a
 * diferencia de un batch 100% automático con posición fija.
 */
export default function WatermarkBatchModal({ items, onApplyOne, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState({ x: 0.92, y: 0.92, scale: 0.16 });
  const [processing, setProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragging = useRef(false);

  const current = items[idx];
  const finished = idx >= items.length;
  const currentIsVideo = current ? isVideo(current) : false;

  useEffect(() => { setPos({ x: 0.92, y: 0.92, scale: 0.16 }); setProgressPct(0); }, [idx]);

  const onLogoPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
  };
  const onOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setPos(p => ({
      ...p,
      x: Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1),
      y: Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1),
    }));
  };
  useEffect(() => {
    const onUp = () => { dragging.current = false; };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, []);

  const applyPhoto = useCallback(async () => {
    const [photoImg, logoImg] = await Promise.all([
      loadImg(cxCard(current.url), true),
      loadImg(WATERMARK_LOGO_URL, false),
    ]);
    // Cap de resolución: sin esto, una foto de celular de alta resolución
    // se reencodearía a su tamaño nativo completo (varios MB), mucho más
    // pesada que lo que Cloudinary sirve normalmente — eso fue lo que hizo
    // que las fotos con marca de agua ya aplicada cargaran mucho más lento.
    const scale = Math.min(1, MAX_DIM / Math.max(photoImg.naturalWidth, photoImg.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(photoImg.naturalWidth * scale);
    canvas.height = Math.round(photoImg.naturalHeight * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(photoImg, 0, 0, canvas.width, canvas.height);

    const wmW = canvas.width * pos.scale;
    const wmH = wmW * (logoImg.naturalHeight / logoImg.naturalWidth || 1);
    const wmX = Math.min(Math.max(pos.x * canvas.width - wmW / 2, 0), canvas.width - wmW);
    const wmY = Math.min(Math.max(pos.y * canvas.height - wmH / 2, 0), canvas.height - wmH);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(logoImg, wmX, wmY, wmW, wmH);
    ctx.globalAlpha = 1;

    const blob = await new Promise<Blob>((res, rej) => {
      canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/webp', 0.92);
    });
    return new File([blob], `${current.id}-wm.webp`, { type: 'image/webp' });
  }, [current, pos]);

  const applyVideo = useCallback(async () => {
    const video = videoRef.current!;
    const logoImg = await loadImg(WATERMARK_LOGO_URL, false);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;

    const canvasStream = canvas.captureStream(30);
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();
    const source = audioCtx.createMediaElementSource(video);
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    source.connect(audioCtx.destination);
    dest.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t));

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus' : 'video/webm';
    const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 5_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    const recordingDone = new Promise<Blob>(resolve => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    });

    video.currentTime = 0;
    video.muted = false;
    recorder.start();

    let raf = 0;
    const drawFrame = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const wmW = canvas.width * pos.scale;
      const wmH = wmW * (logoImg.naturalHeight / logoImg.naturalWidth || 1);
      const wmX = Math.min(Math.max(pos.x * canvas.width - wmW / 2, 0), canvas.width - wmW);
      const wmY = Math.min(Math.max(pos.y * canvas.height - wmH / 2, 0), canvas.height - wmH);
      ctx.globalAlpha = 0.85;
      ctx.drawImage(logoImg, wmX, wmY, wmW, wmH);
      ctx.globalAlpha = 1;
      if (video.duration > 0) setProgressPct(Math.min(100, Math.round((video.currentTime / video.duration) * 100)));
      if (!video.ended && !video.paused) raf = requestAnimationFrame(drawFrame);
    };

    await video.play();
    raf = requestAnimationFrame(drawFrame);
    await new Promise<void>(resolve => { video.onended = () => resolve(); });
    cancelAnimationFrame(raf);
    recorder.stop();
    audioCtx.close();

    const blob = await recordingDone;
    return new File([blob], `${current.id}-wm.webm`, { type: 'video/webm' });
  }, [current, pos]);

  const applyAndNext = useCallback(async () => {
    if (!current || processing) return;
    setError('');
    setProcessing(true);
    try {
      const file = currentIsVideo ? await applyVideo() : await applyPhoto();
      const newUrl = await uploadFile(file, 'jym/galeria');
      await onApplyOne(current.id, newUrl);
      setDone(d => [...d, current.id]);
      setIdx(i => i + 1);
    } catch (e: any) {
      const msg = String(e?.message || '');
      setError(/tainted|SecurityError/i.test(msg)
        ? 'Este archivo no permite procesarse desde este dominio (CORS). Sáltalo o corrígelo desde el editor individual.'
        : (msg || 'Error al aplicar la marca de agua.'));
    } finally {
      setProcessing(false);
    }
  }, [current, processing, currentIsVideo, applyVideo, applyPhoto, onApplyOne]);

  const skip = () => setIdx(i => i + 1);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, overflow: 'hidden', maxWidth: 720, width: '100%',
        boxShadow: '0 32px 64px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', maxHeight: '92vh',
      }}>
        <div style={{
          padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', margin: 0 }}>
              💧 Añadir marca de agua en lote
            </p>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0, marginTop: 2 }}>
              {finished
                ? 'Listo'
                : `${currentIsVideo ? 'Video' : 'Foto'} ${idx + 1} de ${items.length} — arrastra el logo para posicionarlo`}
            </p>
          </div>
          <button onClick={onClose} type="button" disabled={processing} style={{
            background: 'none', border: 'none', cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '1.3rem', color: '#94a3b8', padding: 4,
          }}>✕</button>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto', padding: '1rem', background: '#0d1117',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {finished ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ fontSize: '3rem', margin: 0 }}>✅</p>
              <p style={{ color: '#fff', fontWeight: 700, marginTop: 12 }}>
                {done.length} de {items.length} archivo(s) actualizados con marca de agua
              </p>
            </div>
          ) : (
            <div ref={containerRef} onPointerMove={onOverlayPointerMove} style={{
              position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '68vh', lineHeight: 0,
            }}>
              {currentIsVideo ? (
                <video
                  ref={videoRef}
                  src={cxVideo(current.url)}
                  playsInline
                  crossOrigin="anonymous"
                  muted={processing}
                  style={{ maxWidth: '100%', maxHeight: '68vh', display: 'block', borderRadius: 12 }}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={cxCard(current.url)} alt={current.alt || ''} style={{
                  maxWidth: '100%', maxHeight: '68vh', display: 'block', borderRadius: 12,
                }} />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={WATERMARK_LOGO_URL}
                alt="Marca de agua"
                draggable={false}
                onPointerDown={onLogoPointerDown}
                style={{
                  position: 'absolute',
                  left: `${pos.x * 100}%`, top: `${pos.y * 100}%`,
                  width: `${pos.scale * 100}%`,
                  transform: 'translate(-50%,-50%)',
                  cursor: 'grab', opacity: 0.9,
                  filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))',
                  border: '1.5px dashed rgba(255,255,255,0.7)',
                  pointerEvents: processing ? 'none' : 'auto',
                }}
              />
            </div>
          )}
        </div>

        {!finished && (
          <div style={{
            padding: '0.6rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>Tamaño logo</span>
            <input
              type="range" min={0.06} max={0.4} step={0.01} value={pos.scale} disabled={processing}
              onChange={e => setPos(p => ({ ...p, scale: Number(e.target.value) }))}
              style={{ flex: 1 }}
            />
          </div>
        )}

        {processing && currentIsVideo && (
          <div style={{ padding: '0 1.5rem', flexShrink: 0 }}>
            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', margin: '0.5rem 0' }}>
              <div style={{
                height: '100%', width: `${progressPct}%`,
                background: 'linear-gradient(90deg,#1e3a5f,#d4a017)', borderRadius: 3, transition: 'width .2s',
              }} />
            </div>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', margin: '0 0 0.5rem' }}>
              Procesando video… {progressPct}% — tarda aprox. lo mismo que dura el video
            </p>
          </div>
        )}

        {error && (
          <p style={{
            margin: '0 1.5rem', fontSize: '0.78rem', color: '#ef4444', background: '#fff1f2',
            border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px',
          }}>
            ❌ {error}
          </p>
        )}

        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10,
          alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, flexWrap: 'wrap',
        }}>
          {finished ? (
            <button onClick={onClose} type="button" style={{
              padding: '0.6rem 1.4rem', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', color: '#fff',
              cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 700,
            }}>
              Cerrar
            </button>
          ) : (
            <>
              <button onClick={skip} type="button" disabled={processing} style={{
                padding: '0.6rem 1.2rem', borderRadius: 10, border: '1.5px solid #e2e8f0',
                background: '#fff', cursor: processing ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem', color: '#475569', fontFamily: 'inherit', fontWeight: 600,
              }}>
                Saltar este archivo
              </button>
              <button onClick={applyAndNext} type="button" disabled={processing} style={{
                padding: '0.6rem 1.4rem', borderRadius: 10, border: 'none',
                background: processing
                  ? 'linear-gradient(135deg,#4b6a8f,#6b93d6)'
                  : 'linear-gradient(135deg,#1e3a5f,#2563eb)',
                color: '#fff', cursor: processing ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 700,
              }}>
                {processing
                  ? (currentIsVideo ? `Procesando… ${progressPct}%` : 'Aplicando…')
                  : (idx === items.length - 1 ? '✓ Aplicar y terminar' : '✓ Aplicar y siguiente →')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function loadImg(url: string, cors: boolean): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('No se pudo cargar la imagen'));
    img.src = url;
  });
}
