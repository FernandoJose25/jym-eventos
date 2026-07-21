'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

const WATERMARK_LOGO_URL = '/logo-watermark.png';

interface Filters { brightness: number; contrast: number; saturate: number }
interface Watermark { enabled: boolean; x: number; y: number; scale: number }

const DEFAULT_FILTERS: Filters = { brightness: 100, contrast: 100, saturate: 100 };
const DEFAULT_WATERMARK: Watermark = { enabled: false, x: 0.92, y: 0.92, scale: 0.16 };

interface Props {
  src: string;
  onApply: (file: File) => Promise<void>;
  onSkip: () => void;
}

/**
 * Reprocesa un video 100% en el navegador: dibuja cada frame en un canvas
 * con filtros CSS + marca de agua superpuesta, y graba el resultado con
 * MediaRecorder (canvas.captureStream() + el audio original enrutado vía
 * AudioContext, para no perder el sonido). No hay forma de "hornear" esto
 * sin recorrer el video completo — el proceso tarda aproximadamente lo
 * mismo que la duración del video.
 */
export default function VideoEditorModal({ src, onApply, onSkip }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const wmDrag = useRef(false);

  const [videoLoaded, setVideoLoaded] = useState(false);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [watermark, setWatermark] = useState<Watermark>(DEFAULT_WATERMARK);
  const [quality, setQuality] = useState(0.85);
  const [processing, setProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [error, setError] = useState('');
  // Peso y bitrate del archivo fuente, para avisar cuando viene crudo del
  // celular (graban a 20+ Mbps priorizando no perder nada, no el peso web).
  const [srcInfo, setSrcInfo] = useState<{ mb: number; mbps: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { logoImgRef.current = img; };
    img.src = WATERMARK_LOGO_URL;
  }, []);

  const onLoadedMetadata = () => {
    const v = videoRef.current!;
    setDims({ w: v.videoWidth, h: v.videoHeight });
    setVideoLoaded(true);
    if (v.duration > 0) {
      fetch(src)
        .then(r => r.blob())
        .then(b => setSrcInfo({
          mb: b.size / 1024 / 1024,
          mbps: (b.size * 8) / v.duration / 1_000_000,
        }))
        .catch(() => {});
    }
  };

  const cssFilter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`;

  const onWatermarkPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    wmDrag.current = true;
  };
  const onOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!wmDrag.current || !previewContainerRef.current) return;
    const r = previewContainerRef.current.getBoundingClientRect();
    setWatermark(w => ({
      ...w,
      x: Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1),
      y: Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1),
    }));
  };
  useEffect(() => {
    const onUp = () => { wmDrag.current = false; };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, []);

  const process = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || processing) return;
    setError('');
    setProcessing(true);
    setProgressPct(0);

    try {
      canvas.width = dims.w;
      canvas.height = dims.h;
      const ctx = canvas.getContext('2d')!;

      const canvasStream = canvas.captureStream(30);

      // Enruta el audio original del <video> hacia el stream grabado, para
      // no perder el sonido al recodificar solo los frames visuales.
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination);
      dest.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t));

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      // El bitrate objetivo se limita al bitrate del archivo ORIGINAL: regrabar
      // por encima de él solo infla el peso sin ganar calidad (la información
      // que no está en la fuente no se puede inventar — un video de 15 MB a
      // "calidad 100%" terminaba pesando 73 MB idéntico a la vista). Piso de
      // 1 Mbps para no destrozar fuentes ya muy comprimidas.
      let sourceBps = Infinity;
      try {
        const blob = await (await fetch(src)).blob();
        if (video.duration > 0) sourceBps = (blob.size * 8) / video.duration;
      } catch { /* si no se puede medir, se usa solo la fórmula del slider */ }
      const targetBps = Math.round(
        Math.min(2_000_000 + quality * 6_000_000, Math.max(sourceBps, 1_000_000)),
      );

      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: targetBps,
      });
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
        ctx.filter = cssFilter;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (watermark.enabled && logoImgRef.current) {
          ctx.filter = 'none';
          const logo = logoImgRef.current;
          const wmW = canvas.width * watermark.scale;
          const wmH = wmW * (logo.naturalHeight / logo.naturalWidth || 1);
          const wmX = Math.min(Math.max(watermark.x * canvas.width - wmW / 2, 0), canvas.width - wmW);
          const wmY = Math.min(Math.max(watermark.y * canvas.height - wmH / 2, 0), canvas.height - wmH);
          ctx.globalAlpha = 0.85;
          ctx.drawImage(logo, wmX, wmY, wmW, wmH);
          ctx.globalAlpha = 1;
        }
        if (video.duration > 0) setProgressPct(Math.min(100, Math.round((video.currentTime / video.duration) * 100)));
        if (!video.ended && !video.paused) raf = requestAnimationFrame(drawFrame);
      };

      await video.play();
      raf = requestAnimationFrame(drawFrame);

      await new Promise<void>(resolve => {
        video.onended = () => resolve();
      });
      cancelAnimationFrame(raf);
      recorder.stop();
      audioCtx.close();

      const blob = await recordingDone;
      const file = new File([blob], 'video-editado.webm', { type: 'video/webm' });
      await onApply(file);
    } catch (e: any) {
      setError(e?.message || 'Error al procesar el video. Intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  }, [dims, cssFilter, watermark, quality, processing, onApply]);

  return (
    <div className="editor-modal-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div className="editor-modal-panel" style={{
        background: '#fff', borderRadius: 20, overflow: 'hidden', maxWidth: 720, width: '100%',
        boxShadow: '0 32px 64px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', maxHeight: '92vh',
      }}>
        <div style={{
          padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', margin: 0 }}>
              🎬 Editar video
            </p>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0, marginTop: 2 }}>
              Color, calidad y marca de agua — el procesado tarda aprox. lo mismo que dura el video
            </p>
          </div>
          <button onClick={onSkip} type="button" disabled={processing} style={{
            background: 'none', border: 'none', cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '1.3rem', color: '#94a3b8', lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>

        <div style={{
          padding: '0.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 10,
          borderBottom: '1px solid #e2e8f0', flexShrink: 0, background: '#f8fafc',
        }}>
          {([
            ['brightness', 'Brillo'], ['contrast', 'Contraste'], ['saturate', 'Saturación'],
          ] as [keyof Filters, string][]).map(([field, lbl]) => (
            <label key={field} className="editor-modal-row" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#475569' }}>
              <span className="editor-modal-row-label" style={{ width: 80, flexShrink: 0, fontWeight: 600 }}>{lbl}</span>
              <input
                type="range" min={50} max={150} value={filters[field]} disabled={processing}
                onChange={e => setFilters(f => ({ ...f, [field]: Number(e.target.value) }))}
                style={{ flex: 1 }}
              />
              <span style={{ width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{filters[field]}%</span>
            </label>
          ))}

          <label className="editor-modal-row" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#475569' }}>
            <span className="editor-modal-row-label" style={{ width: 80, flexShrink: 0, fontWeight: 600 }}>Calidad</span>
            <input
              type="range" min={0.3} max={1} step={0.01} value={quality} disabled={processing}
              onChange={e => setQuality(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(quality * 100)}%</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>
            <input
              type="checkbox" checked={watermark.enabled} disabled={processing}
              onChange={e => setWatermark(w => ({ ...w, enabled: e.target.checked }))}
            />
            💧 Añadir marca de agua (logo de la empresa)
          </label>
          {watermark.enabled && (
            <label className="editor-modal-row" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#475569' }}>
              <span className="editor-modal-row-label" style={{ width: 80, flexShrink: 0, fontWeight: 600 }}>Tamaño logo</span>
              <input
                type="range" min={0.06} max={0.4} step={0.01} value={watermark.scale} disabled={processing}
                onChange={e => setWatermark(w => ({ ...w, scale: Number(e.target.value) }))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Arrastra el logo sobre el video</span>
            </label>
          )}
        </div>

        <div className="editor-modal-canvas" style={{
          flex: 1, overflowY: 'auto', padding: '1rem', background: '#0d1117',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div ref={previewContainerRef} onPointerMove={onOverlayPointerMove} style={{
            position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '52vh', lineHeight: 0,
          }}>
            <video
              ref={videoRef}
              className="editor-modal-media"
              src={src}
              onLoadedMetadata={onLoadedMetadata}
              muted={processing}
              playsInline
              crossOrigin="anonymous"
              style={{ maxWidth: '100%', maxHeight: '52vh', display: 'block', borderRadius: 12, filter: cssFilter }}
            />
            {watermark.enabled && videoLoaded && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={WATERMARK_LOGO_URL}
                alt="Marca de agua"
                draggable={false}
                onPointerDown={onWatermarkPointerDown}
                style={{
                  position: 'absolute',
                  left: `${watermark.x * 100}%`, top: `${watermark.y * 100}%`,
                  width: `${watermark.scale * 100}%`,
                  transform: 'translate(-50%,-50%)',
                  cursor: 'grab', opacity: 0.9,
                  filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))',
                  border: '1.5px dashed rgba(255,255,255,0.7)',
                  pointerEvents: processing ? 'none' : 'auto',
                }}
              />
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </div>

        {processing && (
          <div style={{ padding: '0 1.5rem', flexShrink: 0 }}>
            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', margin: '0.5rem 0' }}>
              <div style={{
                height: '100%', width: `${progressPct}%`,
                background: 'linear-gradient(90deg,#1e3a5f,#d4a017)', borderRadius: 3, transition: 'width .2s',
              }} />
            </div>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', margin: '0 0 0.5rem' }}>
              Procesando video… {progressPct}% — no cierres esta ventana
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

        {/* Aviso de video pesado: grabaciones directas de celular vienen a
            20+ Mbps — en la web eso solo hace lenta la página, no se ve
            mejor. "Procesar y subir" (aunque no toques ningún filtro) lo
            comprime a un bitrate web sin pérdida visible. */}
        {!processing && srcInfo && srcInfo.mbps > 8 && (
          <p style={{
            margin: '0.5rem 1.5rem 0', fontSize: '0.78rem', color: '#92400e', background: '#fffbeb',
            border: '1px solid #fde68a', borderRadius: 8, padding: '6px 10px',
          }}>
            ⚠️ Este video pesa <strong>{srcInfo.mb.toFixed(0)} MB</strong> ({srcInfo.mbps.toFixed(0)} Mbps
            — típico de grabación directa de celular). Subirlo así hará lenta la página y no se
            verá mejor. Usa <strong>“✓ Procesar y subir”</strong> (sin tocar nada más) para
            comprimirlo sin pérdida visible de calidad.
          </p>
        )}

        <div className="editor-modal-footer" style={{
          padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10,
          alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, flexWrap: 'wrap',
        }}>
          <button onClick={onSkip} type="button" disabled={processing} style={{
            padding: '0.6rem 1.2rem', borderRadius: 10, border: '1.5px solid #e2e8f0',
            background: '#fff', cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem', color: '#475569', fontFamily: 'inherit', fontWeight: 600,
          }}>
            Subir sin editar
          </button>
          <button onClick={process} type="button" disabled={processing || !videoLoaded} style={{
            padding: '0.6rem 1.4rem', borderRadius: 10, border: 'none',
            background: processing
              ? 'linear-gradient(135deg,#4b6a8f,#6b93d6)'
              : 'linear-gradient(135deg,#1e3a5f,#2563eb)',
            color: '#fff', cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 700,
          }}>
            {processing ? `Procesando… ${progressPct}%` : '✓ Procesar y subir'}
          </button>
        </div>
      </div>
    </div>
  );
}
