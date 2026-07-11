'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { validateFile } from '@/lib/file-validation';
import { getToken } from '@/lib/get-token';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

interface FP { x: number; y: number }
interface CropBox { x: number; y: number; w: number; h: number }
interface Filters { brightness: number; contrast: number; saturate: number }
interface Watermark { enabled: boolean; x: number; y: number; scale: number }

const DEFAULT_FILTERS: Filters = { brightness: 100, contrast: 100, saturate: 100 };
const DEFAULT_WATERMARK: Watermark = { enabled: false, x: 0.92, y: 0.92, scale: 0.16 };
const WATERMARK_LOGO_URL = '/logo-watermark.png';

interface Props {
  value?: string;
  focal?: FP;
  folder?: string;
  label?: string;
  onComplete: (url: string, fp: FP, type?: string) => void;
  onSound?: (enabled: boolean) => void;
  soundEnabled?: boolean;
  className?: string;
  acceptVideo?: boolean;
  /** Relación de aspecto fija para el crop. undefined = libre */
  cropAspect?: number;
  /**
   * Relación de aspecto (ancho/alto) del bloque en la web pública donde
   * se mostrará esta imagen. Controla la forma del previsualizador de
   * punto de enfoque. Ejemplos: 16/9, 1, 3/4, 3/1.
   * Por defecto: 16/9.
   */
  previewAspect?: number;
  /** Etiqueta corta que describe el bloque destino, p.ej. "Banner hero" */
  previewLabel?: string;
}

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/* ─── canvas crop ─── */
async function loadWatermarkImg(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise(res => {
    const wm = new Image();
    wm.crossOrigin = 'anonymous';
    wm.onload = () => res(wm);
    wm.onerror = () => res(null);
    wm.src = url;
  });
}

async function applyCropToFile(
  img: HTMLImageElement,
  box: CropBox,
  displayW: number,
  displayH: number,
  fileName: string,
  filters: Filters = DEFAULT_FILTERS,
  quality: number = 0.92,
  upscale: number = 1,
  watermark?: { img: HTMLImageElement; x: number; y: number; scale: number },
): Promise<File> {
  const scaleX = img.naturalWidth / displayW;
  const scaleY = img.naturalHeight / displayH;
  const cropW = Math.round(box.w * scaleX);
  const cropH = Math.round(box.h * scaleY);

  // canvas final: aplica escala (upscale) + filtros sobre el recorte
  // (la rotación ya viene horneada en `img`, aplicada en tiempo real en el modal)
  const outW = Math.round(cropW * upscale);
  const outH = Math.round(cropH * upscale);
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`;
  ctx.drawImage(
    img,
    Math.round(box.x * scaleX), Math.round(box.y * scaleY),
    cropW, cropH,
    0, 0, outW, outH,
  );

  if (watermark) {
    ctx.filter = 'none';
    const wmW = outW * watermark.scale;
    const wmH = wmW * (watermark.img.naturalHeight / watermark.img.naturalWidth || 1);
    const wmX = Math.min(Math.max(watermark.x * outW - wmW / 2, 0), outW - wmW);
    const wmY = Math.min(Math.max(watermark.y * outH - wmH / 2, 0), outH - wmH);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(watermark.img, wmX, wmY, wmW, wmH);
    ctx.globalAlpha = 1;
  }

  // try WebP first, fall back to PNG (some browsers block WebP toBlob on certain origins)
  const blob = await new Promise<Blob>((res, rej) => {
    canvas.toBlob(b => {
      if (b) { res(b); return; }
      canvas.toBlob(b2 => b2 ? res(b2) : rej(new Error('toBlob failed')), 'image/png');
    }, 'image/webp', quality);
  });
  const ext = blob.type === 'image/webp' ? '.webp' : '.png';
  return new File([blob], fileName.replace(/\.\w+$/, ext), { type: blob.type });
}

/* ─── crop modal ─── */
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move' | null;

/**
 * Bugs corregidos vs versión anterior:
 *
 * 1. onOverlayClick disparaba después de cada arrastre (dragRef ya era null
 *    cuando llegaba el evento click → box saltaba a la posición de release).
 *    FIX: ref `didDrag` que suprime el onClick si hubo movimiento.
 *
 * 2. onPointerMove en el container era poco fiable cuando el puntero salía
 *    del div durante el resize rápido.
 *    FIX: listeners globales en window (pointermove / pointerup) montados
 *    con useEffect mientras hay una operación de arrastre activa.
 *
 * 3. imgSize leída de closure en useCallback podía estar en 0,0 si el
 *    callback se ejecutaba antes de la primera re-render tras onLoad.
 *    FIX: imgW / imgH se capturan en el dragRef en el momento exacto de
 *    pointerdown desde imgRef.current.offsetWidth/offsetHeight.
 *
 * 4. Aspect-ratio: al llegar al borde el eje dependiente no se recalculaba
 *    correctamente causando deformación.
 *    FIX: ambos ejes se calculan y se ajusta el eje libre para respetar
 *    siempre la relación de aspecto.
 */
function CropModal({
  src,
  aspect,
  onApply,
  onSkip,
}: {
  src: string;
  aspect?: number;
  onApply: (
    box: CropBox, displayW: number, displayH: number, img: HTMLImageElement,
    filters: Filters, quality: number, upscale: number,
    watermark: Watermark, logoUrl: string,
  ) => Promise<void>;
  onSkip: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [box, setBox] = useState<CropBox>({ x: 0, y: 0, w: 0, h: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [applying, setApplying] = useState(false);
  const [applyErr, setApplyErr] = useState('');
  const [corsError, setCorsError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  /* ── rotación / filtros / calidad / marca de agua ──
     La rotación se "hornea" de inmediato en un nuevo src (vía canvas) para
     que el usuario vea la imagen ya orientada mientras recorta — no solo
     un aviso de que se rotará al guardar. El resto del crop (drag, resize,
     aspect ratio) sigue igual porque solo ve una imagen distinta. */
  const [displaySrc, setDisplaySrc] = useState(src);
  const [rotating, setRotating] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [quality, setQuality] = useState(0.92);
  const [upscale, setUpscale] = useState(1);
  const [watermark, setWatermark] = useState<Watermark>(DEFAULT_WATERMARK);
  const logoUrl = WATERMARK_LOGO_URL;
  const [showAdjust, setShowAdjust] = useState(false);
  const wmDrag = useRef(false);

  const cssFilter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`;

  /* ── rotar físicamente el src (canvas) para previsualizar en tiempo real ── */
  const rotate = useCallback((delta: 90 | -90) => {
    if (rotating) return;
    setRotating(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((delta * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      setDisplaySrc(canvas.toDataURL('image/png'));
      setImgLoaded(false);
      setRotating(false);
    };
    img.onerror = () => { setRotating(false); setCorsError(true); };
    img.src = displaySrc;
  }, [displaySrc, rotating]);

  const onWatermarkPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    wmDrag.current = true;
  };

  const onOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!wmDrag.current) return;
    const r = containerRef.current!.getBoundingClientRect();
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

  /* ── drag state ──────────────────────────────────────────────────────────
     Todo se guarda en un ref para que los handlers de window no tengan
     closures rancias. imgW/imgH se leen del DOM en el momento del pointerdown.
  ───────────────────────────────────────────────────────────────────────── */
  const drag = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    origBox: CropBox;
    imgW: number;
    imgH: number;
  } | null>(null);

  /* Impide que onClick dispare la lógica de reposicionado después de un drag */
  const didDrag = useRef(false);

  /* ── init box ────────────────────────────────────────────────────────── */
  const initBox = useCallback((w: number, h: number) => {
    if (aspect) {
      const bw = w * 0.9;
      const bh = Math.min(bw / aspect, h * 0.9);
      const bw2 = bh * aspect;
      setBox({ x: (w - bw2) / 2, y: (h - bh) / 2, w: bw2, h: bh });
    } else {
      const pad = Math.min(w, h) * 0.05;
      setBox({ x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 });
    }
  }, [aspect]);

  const onImgLoad = () => {
    const img = imgRef.current!;
    setImgSize({ w: img.offsetWidth, h: img.offsetHeight });
    initBox(img.offsetWidth, img.offsetHeight);
    setImgLoaded(true);
    setCorsError(false);
  };

  /* ── ajustes rápidos: centrar / imagen completa / reset ─────────────── */
  const centerBox = useCallback(() => {
    setBox(prev => ({
      ...prev,
      x: (imgSize.w - prev.w) / 2,
      y: (imgSize.h - prev.h) / 2,
    }));
  }, [imgSize]);

  const fitFull = useCallback(() => {
    if (!imgSize.w || !imgSize.h) return;
    if (aspect) {
      const bw = imgSize.w;
      const bh = Math.min(bw / aspect, imgSize.h);
      const bw2 = bh * aspect;
      setBox({ x: (imgSize.w - bw2) / 2, y: (imgSize.h - bh) / 2, w: bw2, h: bh });
    } else {
      setBox({ x: 0, y: 0, w: imgSize.w, h: imgSize.h });
    }
  }, [imgSize, aspect]);

  const resetBox = useCallback(() => {
    initBox(imgSize.w, imgSize.h);
  }, [imgSize, initBox]);

  /* ── edición numérica precisa (X / Y / Ancho / Alto) ─────────────────
     Permite teclear valores exactos en px en vez de depender solo del
     arrastre con mouse/touch — más preciso para recortes puntuales. */
  const setBoxField = (field: keyof CropBox, raw: string) => {
    const val = Number(raw);
    if (!Number.isFinite(val)) return;
    setBox(prev => {
      let { x, y, w, h } = prev;
      const MIN = 20;
      if (field === 'x') x = Math.max(0, Math.min(val, imgSize.w - w));
      if (field === 'y') y = Math.max(0, Math.min(val, imgSize.h - h));
      if (field === 'w') {
        w = Math.max(MIN, Math.min(val, imgSize.w - x));
        if (aspect) h = Math.max(MIN, Math.min(w / aspect, imgSize.h - y));
      }
      if (field === 'h') {
        h = Math.max(MIN, Math.min(val, imgSize.h - y));
        if (aspect) w = Math.max(MIN, Math.min(h * aspect, imgSize.w - x));
      }
      return { x, y, w, h };
    });
  };

  /* ── nudge por teclado — flechas mueven 1px, Shift+flecha 10px ──────── */
  const onBoxKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft') dx = -step;
    else if (e.key === 'ArrowRight') dx = step;
    else if (e.key === 'ArrowUp') dy = -step;
    else if (e.key === 'ArrowDown') dy = step;
    else return;
    e.preventDefault();
    setBox(prev => ({
      ...prev,
      x: Math.max(0, Math.min(prev.x + dx, imgSize.w - prev.w)),
      y: Math.max(0, Math.min(prev.y + dy, imgSize.h - prev.h)),
    }));
  };

  /* ── listeners globales en window ───────────────────────────────────────
     Se montan una sola vez. Leen todo desde `drag.current` (ref),
     sin closures sobre state.
  ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const MIN = 20;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      didDrag.current = true;

      const { handle, startX, startY, origBox, imgW, imgH } = drag.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let { x, y, w, h } = origBox;

      if (handle === 'move') {
        x = clamp(x + dx, 0, imgW - w);
        y = clamp(y + dy, 0, imgH - h);
      } else {
        /* ── resize ──────────────────────────────────────────────────── */
        if (handle?.includes('e')) w = clamp(w + dx, MIN, imgW - x);
        if (handle?.includes('s')) h = clamp(h + dy, MIN, imgH - y);
        if (handle?.includes('w')) {
          const nw = clamp(w - dx, MIN, x + w);
          x = x + w - nw; w = nw;
        }
        if (handle?.includes('n')) {
          const nh = clamp(h - dy, MIN, y + h);
          y = y + h - nh; h = nh;
        }

        /* ── mantener aspect ratio ───────────────────────────────────── */
        if (aspect) {
          if (handle?.includes('e') || handle?.includes('w')) {
            /* ancla: x + w; ajusta h */
            const newH = w / aspect;
            if (newH >= MIN && y + newH <= imgH) {
              h = newH;
            } else {
              h = clamp(imgH - y, MIN, imgH);
              w = clamp(h * aspect, MIN, imgW - x);
            }
          } else {
            /* ancla: y + h; ajusta w */
            const newW = h * aspect;
            if (newW >= MIN && x + newW <= imgW) {
              w = newW;
            } else {
              w = clamp(imgW - x, MIN, imgW);
              h = clamp(w / aspect, MIN, imgH - y);
            }
          }
        }
      }

      setBox({ x, y, w, h });
    };

    const onUp = () => { drag.current = null; };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []); /* sin dependencias — todo se lee desde refs */

  /* ── pointerdown en handles / crop-box ──────────────────────────────── */
  const onPointerDown = (e: React.PointerEvent, handle: Handle) => {
    e.preventDefault();     // evita selección de texto y drag nativo del browser
    e.stopPropagation();
    if (!imgRef.current) return;
    didDrag.current = false;
    drag.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origBox: { ...box },                      // snapshot del estado actual
      imgW: imgRef.current.offsetWidth,      // tamaño real en el DOM ahora
      imgH: imgRef.current.offsetHeight,
    };
  };

  /* ── click en el overlay (solo si NO hubo drag) ─────────────────────── */
  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (didDrag.current) { didDrag.current = false; return; }
    const r = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    setBox(prev => ({
      ...prev,
      x: Math.max(0, Math.min(mx - prev.w / 2, imgSize.w - prev.w)),
      y: Math.max(0, Math.min(my - prev.h / 2, imgSize.h - prev.h)),
    }));
  };

  /* ── apply ──────────────────────────────────────────────────────────── */
  const handleApply = async () => {
    if (!imgRef.current || applying) return;
    setApplyErr('');
    setApplying(true);
    try {
      await onApply(box, imgSize.w, imgSize.h, imgRef.current, filters, quality, upscale,
        { ...watermark, enabled: watermark.enabled && !!logoUrl }, logoUrl);
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isTainted = err?.name === 'SecurityError' || /tainted/i.test(msg);
      setApplyErr(
        isTainted
          ? 'El servidor de la imagen no permite exportarla desde este dominio (CORS). Sube la foto de nuevo desde tu equipo, o usa "Usar sin recortar".'
          : (msg || 'Error al recortar. Intenta de nuevo.'),
      );
      setApplying(false);
    }
  };

  const handles: { id: Handle; cursor: string; style: React.CSSProperties }[] = [
    { id: 'nw', cursor: 'nw-resize', style: { top: -7, left: -7 } },
    { id: 'n', cursor: 'n-resize', style: { top: -7, left: 'calc(50% - 7px)' } },
    { id: 'ne', cursor: 'ne-resize', style: { top: -7, right: -7 } },
    { id: 'e', cursor: 'e-resize', style: { top: 'calc(50% - 7px)', right: -7 } },
    { id: 'se', cursor: 'se-resize', style: { bottom: -7, right: -7 } },
    { id: 's', cursor: 's-resize', style: { bottom: -7, left: 'calc(50% - 7px)' } },
    { id: 'sw', cursor: 'sw-resize', style: { bottom: -7, left: -7 } },
    { id: 'w', cursor: 'w-resize', style: { top: 'calc(50% - 7px)', left: -7 } },
  ];

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        maxWidth: 720, width: '100%', boxShadow: '0 32px 64px rgba(0,0,0,0.55)',
        display: 'flex', flexDirection: 'column', maxHeight: '92vh',
      }}>
        {/* header */}
        <div style={{
          padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', margin: 0 }}>
              ✂️ Recortar / ajustar imagen
            </p>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0, marginTop: 2 }}>
              Arrastra bordes o esquinas · Flechas del teclado = mover 1px (Shift = 10px) · Clic fuera = centrar
            </p>
          </div>
          <button onClick={onSkip} type="button" disabled={applying} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '1.3rem', color: '#94a3b8', lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>

        {/* barra de ajustes rápidos */}
        {imgLoaded && (
          <div style={{
            padding: '0.5rem 1.5rem', display: 'flex', gap: 8,
            flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', flexShrink: 0
          }}>
            {[
              { label: '⤢ Imagen completa', fn: fitFull },
              { label: '◎ Centrar', fn: centerBox },
              { label: '↺ Restablecer', fn: resetBox },
              { label: '⟲ Rotar izq.', fn: () => rotate(-90) },
              { label: '⟳ Rotar der.', fn: () => rotate(90) },
            ].map(({ label, fn }) => (
              <button key={label} type="button" onClick={fn} disabled={applying} style={{
                padding: '0.3rem 0.7rem', borderRadius: 8, border: '1.5px solid #e2e8f0',
                background: '#f8fafc', cursor: applying ? 'not-allowed' : 'pointer',
                fontSize: '0.72rem', color: '#475569', fontFamily: 'inherit', fontWeight: 600,
              }}>
                {label}
              </button>
            ))}
            <button type="button" onClick={() => setShowAdjust(s => !s)} disabled={applying} style={{
              padding: '0.3rem 0.7rem', borderRadius: 8,
              border: `1.5px solid ${showAdjust ? '#2563eb' : '#e2e8f0'}`,
              background: showAdjust ? '#eff6ff' : '#f8fafc', cursor: applying ? 'not-allowed' : 'pointer',
              fontSize: '0.72rem', color: showAdjust ? '#1d4ed8' : '#475569', fontFamily: 'inherit', fontWeight: 600,
            }}>
              🎛️ Filtros, calidad y marca de agua
            </button>
          </div>
        )}

        {showAdjust && imgLoaded && (
          <div style={{
            padding: '0.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 10,
            borderBottom: '1px solid #e2e8f0', flexShrink: 0, background: '#f8fafc',
          }}>
            {([
              ['brightness', 'Brillo'], ['contrast', 'Contraste'], ['saturate', 'Saturación'],
            ] as [keyof Filters, string][]).map(([field, lbl]) => (
              <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#475569' }}>
                <span style={{ width: 80, flexShrink: 0, fontWeight: 600 }}>{lbl}</span>
                <input
                  type="range" min={50} max={150} value={filters[field]}
                  onChange={e => setFilters(f => ({ ...f, [field]: Number(e.target.value) }))}
                  style={{ flex: 1 }}
                />
                <span style={{ width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{filters[field]}%</span>
              </label>
            ))}
            {(filters.brightness !== 100 || filters.contrast !== 100 || filters.saturate !== 100) && (
              <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} style={{
                alignSelf: 'flex-start', background: 'none', border: 'none', color: '#2563eb',
                fontSize: '0.7rem', cursor: 'pointer', padding: 0, textDecoration: 'underline',
              }}>
                Restablecer filtros
              </button>
            )}

            <div style={{ height: 1, background: '#e2e8f0', margin: '2px 0' }} />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#475569' }}>
              <span style={{ width: 80, flexShrink: 0, fontWeight: 600 }}>Calidad</span>
              <input
                type="range" min={0.6} max={1} step={0.01} value={quality}
                onChange={e => setQuality(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(quality * 100)}%</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#475569' }}>
              <span style={{ width: 80, flexShrink: 0, fontWeight: 600 }}>Escala</span>
              <select value={upscale} onChange={e => setUpscale(Number(e.target.value))} style={{
                borderRadius: 6, border: '1.5px solid #e2e8f0', padding: '3px 6px', fontSize: '0.72rem',
              }}>
                <option value={1}>Original (100%)</option>
                <option value={1.5}>Aumentar 150%</option>
                <option value={2}>Aumentar 200%</option>
              </select>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                Reescala y exporta en mayor resolución — no reconstruye detalle perdido.
              </span>
            </label>

            <div style={{ height: 1, background: '#e2e8f0', margin: '2px 0' }} />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>
              <input
                type="checkbox" checked={watermark.enabled}
                onChange={e => setWatermark(w => ({ ...w, enabled: e.target.checked }))}
              />
              💧 Añadir marca de agua (logo de la empresa)
            </label>
            {watermark.enabled && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#475569' }}>
                <span style={{ width: 80, flexShrink: 0, fontWeight: 600 }}>Tamaño logo</span>
                <input
                  type="range" min={0.06} max={0.4} step={0.01} value={watermark.scale}
                  onChange={e => setWatermark(w => ({ ...w, scale: Number(e.target.value) }))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Arrastra el logo sobre la imagen para posicionarlo</span>
              </label>
            )}
          </div>
        )}

        {/* canvas */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '1rem',
          background: '#0d1117', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          /* evita scroll accidental durante el drag */
          touchAction: 'none'
        }}>
          <div
            ref={containerRef}
            onClick={onOverlayClick}
            onPointerMove={onOverlayPointerMove}
            style={{
              position: 'relative', display: 'inline-block',
              userSelect: 'none', lineHeight: 0, cursor: 'crosshair'
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={displaySrc}
              alt="crop"
              crossOrigin="anonymous"
              onLoad={onImgLoad}
              onError={() => setCorsError(true)}
              draggable={false}
              style={{
                maxWidth: '100%', maxHeight: '58vh', display: 'block',
                opacity: .45, pointerEvents: 'none', filter: cssFilter,
              }}
            />

            {rotating && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.25)', borderTopColor: '#fff',
                  animation: 'spin .7s linear infinite', display: 'inline-block',
                }} />
              </div>
            )}

            {imgSize.w > 0 && (
              <>
                {/* sombra alrededor del recorte */}
                {([
                  { top: 0, left: 0, width: '100%', height: box.y },
                  { top: box.y + box.h, left: 0, width: '100%', bottom: 0 },
                  { top: box.y, left: 0, width: box.x, height: box.h },
                  { top: box.y, left: box.x + box.w, right: 0, height: box.h },
                ] as React.CSSProperties[]).map((s, i) => (
                  <div key={i} style={{
                    position: 'absolute', background: 'rgba(0,0,0,0.6)',
                    pointerEvents: 'none', ...s
                  }} />
                ))}

                {/* área de recorte */}
                <div
                  onPointerDown={e => onPointerDown(e, 'move')}
                  onKeyDown={onBoxKeyDown}
                  tabIndex={0}
                  role="slider"
                  aria-label="Área de recorte — usa las flechas para mover con precisión"
                  aria-valuetext={`${Math.round(box.w)}×${Math.round(box.h)}px en ${Math.round(box.x)},${Math.round(box.y)}`}
                  style={{
                    position: 'absolute',
                    left: box.x, top: box.y, width: box.w, height: box.h,
                    border: '1.5px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.15)',
                    cursor: 'move', boxSizing: 'border-box', outline: 'none',
                  }}
                >
                  {/* rejilla de tercios */}
                  {[1, 2].map(n => (
                    <div key={`v${n}`} style={{
                      position: 'absolute', top: 0, bottom: 0, width: 1,
                      left: `${n * 33.33}%`, background: 'rgba(255,255,255,0.25)',
                      pointerEvents: 'none'
                    }} />
                  ))}
                  {[1, 2].map(n => (
                    <div key={`h${n}`} style={{
                      position: 'absolute', left: 0, right: 0, height: 1,
                      top: `${n * 33.33}%`, background: 'rgba(255,255,255,0.25)',
                      pointerEvents: 'none'
                    }} />
                  ))}

                  {/* handles de redimensión — más grandes y fáciles de agarrar */}
                  {handles.map(({ id, cursor, style }) => (
                    <div
                      key={id}
                      onPointerDown={e => onPointerDown(e, id)}
                      style={{
                        position: 'absolute', width: 14, height: 14,
                        background: '#fff',
                        border: '2px solid #1e3a5f',
                        borderRadius: 3, cursor,
                        boxShadow: '0 1px 5px rgba(0,0,0,0.55)',
                        zIndex: 2,
                        ...style,
                      }}
                    />
                  ))}
                </div>

                {/* badge de tamaño */}
                <div style={{
                  position: 'absolute',
                  left: box.x + box.w / 2,
                  top: Math.max(box.y + box.h + 6, box.y + box.h + 4),
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.75)', color: '#fff',
                  fontSize: '0.63rem', padding: '2px 9px', borderRadius: 6,
                  pointerEvents: 'none', whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {Math.round(box.w)} × {Math.round(box.h)} px
                </div>
              </>
            )}

            {watermark.enabled && logoUrl && imgSize.w > 0 && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt="Marca de agua"
                draggable={false}
                onPointerDown={onWatermarkPointerDown}
                style={{
                  position: 'absolute',
                  left: `${watermark.x * 100}%`,
                  top: `${watermark.y * 100}%`,
                  width: `${watermark.scale * 100}%`,
                  transform: 'translate(-50%,-50%)',
                  cursor: 'grab', opacity: 0.9,
                  filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))',
                  border: '1.5px dashed rgba(255,255,255,0.7)',
                }}
              />
            )}
          </div>
        </div>

        {/* info row — editable para precisión exacta en px */}
        <div style={{
          padding: '0.45rem 1.5rem', background: '#f8fafc',
          borderTop: '1px solid #e2e8f0', display: 'flex',
          gap: 14, flexWrap: 'wrap', alignItems: 'center',
          fontSize: '0.7rem', color: '#64748b', flexShrink: 0
        }}>
          {([
            ['x', 'X'], ['y', 'Y'], ['w', 'Ancho'], ['h', 'Alto'],
          ] as [keyof CropBox, string][]).map(([field, lbl]) => (
            <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {lbl}:
              <input
                type="number"
                value={Math.round(box[field])}
                onChange={e => setBoxField(field, e.target.value)}
                disabled={applying}
                style={{
                  width: 58, padding: '2px 6px', borderRadius: 6,
                  border: '1.5px solid #e2e8f0', fontSize: '0.72rem',
                  fontFamily: 'inherit', color: '#0f172a',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
              px
            </label>
          ))}
          {aspect && (
            <span style={{ color: '#94a3b8' }}>
              Relación fija: <strong>{aspect.toFixed(2)}</strong>
            </span>
          )}
        </div>

        {corsError && (
          <div style={{
            margin: '0 1.5rem 0.75rem', padding: '0.6rem 0.85rem',
            background: '#fff1f2', border: '1px solid #fecaca',
            borderRadius: 8, fontSize: '0.75rem', color: '#9f1239', flexShrink: 0
          }}>
            ❌ No se pudo cargar esta imagen para recortarla — el servidor de origen
            no permite acceso desde este dominio (CORS). Prueba subir la foto de
            nuevo desde tu equipo en vez de recortar la ya publicada, o usa
            &quot;Usar sin recortar&quot;.
          </div>
        )}

        {/* footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0',
          display: 'flex', gap: 10, alignItems: 'center',
          justifyContent: 'flex-end', flexShrink: 0, flexWrap: 'wrap'
        }}>
          {applyErr && (
            <p style={{
              flex: 1, margin: 0, fontSize: '0.78rem', color: '#ef4444',
              background: '#fff1f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '4px 10px'
            }}>
              ❌ {applyErr}
            </p>
          )}
          <button onClick={onSkip} type="button" disabled={applying} style={{
            padding: '0.6rem 1.2rem', borderRadius: 10, border: '1.5px solid #e2e8f0',
            background: '#fff', cursor: applying ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem', color: '#475569',
            fontFamily: 'inherit', fontWeight: 600, opacity: applying ? 0.5 : 1,
          }}>
            Usar sin recortar
          </button>
          <button onClick={handleApply} type="button" disabled={applying} style={{
            padding: '0.6rem 1.4rem', borderRadius: 10, border: 'none',
            background: applying
              ? 'linear-gradient(135deg,#4b6a8f,#6b93d6)'
              : 'linear-gradient(135deg,#1e3a5f,#2563eb)',
            color: '#fff', cursor: applying ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {applying ? (
              <>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin .7s linear infinite',
                  display: 'inline-block', flexShrink: 0,
                }} />
                Aplicando…
              </>
            ) : '✓ Aplicar recorte'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const IMAGE_EXTS = /\.(jpe?g|png|webp|heic|heif|gif|bmp|tiff?)$/i;
const VIDEO_EXTS = /\.(mp4|webm|mov|avi|mkv)$/i;

/* ══════════════════════════════════════════ main component ══ */
export default function ImageUploader({
  value, focal = { x: .5, y: .5 }, folder = 'jym',
  label = 'Imagen', onComplete, onSound, soundEnabled = false,
  className, acceptVideo = true, cropAspect,
  previewAspect = 16 / 9,
  previewLabel,
}: Props) {
  const [preview, setPreview] = useState(value || '');
  const [previewType, setPreviewType] = useState<'image' | 'video'>(
    value?.match(/\.(mp4|webm|mov|avi)$/i) ? 'video' : 'image',
  );
  const [fp, setFp] = useState<FP>(focal);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  interface QualityInfo {
    origSize: number;   // bytes
    finalSize: number;  // bytes
    origW: number; origH: number;
    finalW: number; finalH: number;
    format: string;
  }
  const [quality, setQuality] = useState<QualityInfo | null>(null);

  const [cropSrc, setCropSrc] = useState('');
  const [cropFile, setCropFile] = useState<File | null>(null);

  /* ── upload ── */
  const upload = useCallback(async (file: File, currentFp?: FP) => {
    const useFp = currentFp ?? fp;
    setError(''); setUploading(true); setProgress(0); setQuality(null);
    const isVideo = file.type.startsWith('video/') || VIDEO_EXTS.test(file.name);

    // dimensiones originales
    let origW = 0, origH = 0;
    if (!isVideo) {
      await new Promise<void>(res => {
        const img = new Image();
        img.onload = () => { origW = img.naturalWidth; origH = img.naturalHeight; res(); };
        img.src = URL.createObjectURL(file);
      });
    }

    try {
      const fileToUpload = file;

      let url: string;

      // Intentar Cloudinary primero
      const token = await getToken();
      const signRes = await fetch('/api/cloudinary-sign', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileSize: file.size, fileType: file.type, folder }),
      });

      if (signRes.ok) {
        const { timestamp, signature, apiKey, cloudName } = await signRes.json();
        const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${isVideo ? 'video' : 'image'}/upload`;
        setProgress(isVideo ? 5 : 45);

        url = await new Promise<string>((resolve, reject) => {
          const form = new FormData();
          form.append('file', fileToUpload);
          form.append('api_key', apiKey);
          form.append('timestamp', String(timestamp));
          form.append('signature', signature);
          form.append('folder', folder);

          const xhr = new XMLHttpRequest();
          xhr.open('POST', endpoint);
          xhr.upload.onprogress = e => {
            if (e.lengthComputable) {
              setProgress(isVideo
                ? Math.round(e.loaded / e.total * 90)
                : 45 + Math.round(e.loaded / e.total * 50));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300)
              resolve(JSON.parse(xhr.responseText).secure_url);
            else {
              try { reject(new Error(JSON.parse(xhr.responseText)?.error?.message || `Error ${xhr.status}`)); }
              catch { reject(new Error(`Error HTTP ${xhr.status}`)); }
            }
          };
          xhr.onerror = () => reject(new Error('Error de red'));
          xhr.onabort = () => reject(new Error('Subida cancelada'));
          xhr.send(form);
        });
      } else {
        // Fallback: subir a Firebase Storage
        setProgress(isVideo ? 5 : 40);
        const ext = fileToUpload.name.split('.').pop() || 'bin';
        const path = `${folder}/${Date.now()}.${ext}`;
        const storageRef = ref(storage, path);
        url = await new Promise<string>((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, fileToUpload);
          task.on('state_changed',
            snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 95)),
            reject,
            () => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject),
          );
        });
      }

      setProgress(100);
      setPreview(url);
      setPreviewType(isVideo ? 'video' : 'image');
      if (!isVideo && origW > 0) {
        // leer dimensiones finales del archivo comprimido
        let finalW = origW, finalH = origH;
        await new Promise<void>(res => {
          const img2 = new Image();
          img2.onload = () => { finalW = img2.naturalWidth; finalH = img2.naturalHeight; res(); };
          img2.src = URL.createObjectURL(fileToUpload);
        });
        setQuality({
          origSize: file.size,
          finalSize: fileToUpload.size,
          origW, origH,
          finalW, finalH,
          format: fileToUpload.type === 'image/webp' ? 'WebP' : fileToUpload.type.split('/')[1].toUpperCase(),
        });
      }
      onComplete(url, useFp, isVideo ? 'video' : 'image');
    } catch (e: any) {
      setError(e?.message || 'Error al subir. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  }, [folder, fp, onComplete]);

  /* ── detectar tipo real por extensión (WhatsApp envía como documento con MIME genérico) ── */
  const resolveFileType = (file: File): 'image' | 'video' | null => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    // MIME genérico (ej. application/octet-stream desde WhatsApp) → detectar por extensión
    if (IMAGE_EXTS.test(file.name)) return 'image';
    if (acceptVideo && VIDEO_EXTS.test(file.name)) return 'video';
    return null;
  };

  /* ── dropzone ── */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: acceptVideo
      ? {
        'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
        'video/*': ['.mp4', '.webm', '.mov'],
        'application/octet-stream': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.mp4', '.webm', '.mov'],
      }
      : {
        'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
        'application/octet-stream': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
      },
    maxSize: MAX_VIDEO_BYTES,
    multiple: false,
    validator: (file) => {
      // Permitir archivos con extensión de imagen/video aunque el MIME sea genérico
      const kind = resolveFileType(file);
      if (!kind) return { code: 'file-invalid-type', message: 'Formato no válido.' };
      return null;
    },
    onDrop: async (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length) {
        setError(rejected[0].errors[0].code === 'file-too-large'
          ? 'El archivo supera el límite (100 MB).' : 'Formato no válido. Usa JPG, PNG, WebP o MP4.');
        return;
      }
      const file = accepted[0];
      // Validar magic bytes antes de procesar
      const validation = await validateFile(file);
      if (!validation.ok) {
        setError(validation.reason ?? 'Archivo no permitido.');
        return;
      }
      const kind = resolveFileType(file);
      setQuality(null);
      if (kind === 'video') {
        setPreview(URL.createObjectURL(file));
        setPreviewType('video');
        upload(file);
      } else {
        setCropFile(file);
        setCropSrc(URL.createObjectURL(file));
      }
    },
  });

  /* ── focal point (post-upload) ── */
  const handleFocalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const nfp: FP = {
      x: parseFloat(((e.clientX - r.left) / r.width).toFixed(3)),
      y: parseFloat(((e.clientY - r.top) / r.height).toFixed(3)),
    };
    setFp(nfp);
    if (preview) onComplete(preview, nfp, previewType);
  };

  /* ── crop apply — no try/catch: errores los maneja CropModal ── */
  const handleCropApply = useCallback(async (
    box: CropBox, displayW: number, displayH: number, img: HTMLImageElement,
    filters: Filters, quality: number, upscale: number,
    watermark: Watermark, logoUrl: string,
  ): Promise<void> => {
    const newFp: FP = {
      x: parseFloat(((box.x + box.w / 2) / displayW).toFixed(3)),
      y: parseFloat(((box.y + box.h / 2) / displayH).toFixed(3)),
    };
    setFp(newFp);
    let wm: { img: HTMLImageElement; x: number; y: number; scale: number } | undefined;
    if (watermark.enabled && logoUrl) {
      const wmImg = await loadWatermarkImg(logoUrl);
      if (wmImg) wm = { img: wmImg, x: watermark.x, y: watermark.y, scale: watermark.scale };
    }
    const cropped = await applyCropToFile(img, box, displayW, displayH,
      cropFile?.name ?? 'image.webp', filters, quality, upscale, wm);
    setPreview(URL.createObjectURL(cropped));
    setPreviewType('image');
    setCropSrc('');   // cierra el modal
    upload(cropped, newFp);
  }, [cropFile, upload]);

  const handleCropSkip = () => {
    if (!cropFile) return;
    setCropSrc('');
    setPreview(URL.createObjectURL(cropFile));
    setPreviewType('image');
    upload(cropFile);
  };

  const op = `${fp.x * 100}% ${fp.y * 100}%`;
  const sizeLabel = acceptVideo
    ? 'JPEG · PNG · WebP · HEIC · MP4 · MOV — Máx 100 MB · Incluye fotos enviadas como documento en WhatsApp'
    : 'JPEG · PNG · WebP · HEIC — incluye fotos enviadas como documento en WhatsApp';

  /* paddingTop trick para mantener aspect ratio */
  const previewPadding = `${(1 / previewAspect) * 100}%`;

  return (
    <div className={className}>
      <p style={{
        fontSize: '0.75rem', fontWeight: 700, color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8
      }}>
        {label}
      </p>

      {/* CROP MODAL */}
      {cropSrc && (
        <CropModal
          src={cropSrc}
          aspect={cropAspect}
          onApply={handleCropApply}
          onSkip={handleCropSkip}
        />
      )}

      {/* DROP ZONE */}
      {!preview ? (
        <div {...getRootProps()} style={{
          border: `2px dashed ${isDragActive ? '#2563eb' : '#cbd5e1'}`,
          borderRadius: 16, padding: '2rem', textAlign: 'center', cursor: 'pointer',
          background: isDragActive ? '#eff6ff' : '#f8fafc', transition: 'all 0.2s',
        }}>
          <input {...getInputProps()} />
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🖼️</div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            <span style={{ color: '#2563eb', fontWeight: 600 }}>Click para seleccionar</span>{' '}
            o arrastra aquí
          </p>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>{sizeLabel}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {previewType === 'image' ? (
            <div>
              {/* hint row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 6, gap: 8, flexWrap: 'wrap'
              }}>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
                  📍 Toca para ajustar el <strong>punto de enfoque</strong>
                </p>
                {previewLabel && (
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 600, color: '#1e3a5f',
                    background: 'rgba(30,58,95,0.08)', border: '1px solid rgba(30,58,95,0.15)',
                    borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap',
                  }}>
                    Vista previa · {previewLabel}
                  </span>
                )}
              </div>

              {/* preview container — usa previewAspect para coincidir con el bloque real */}
              <div onClick={handleFocalClick} style={{
                position: 'relative', borderRadius: 12, overflow: 'hidden',
                cursor: 'crosshair', paddingTop: previewPadding, background: '#e2e8f0',
              }}>
                <img src={preview} alt="" style={{
                  position: 'absolute', inset: 0, width: '100%',
                  height: '100%', objectFit: 'cover', objectPosition: op,
                }} />

                {/* punto de enfoque */}
                <div style={{
                  position: 'absolute', width: 24, height: 24, borderRadius: '50%',
                  border: '3px solid #fff', background: 'rgba(212,160,23,0.85)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  transform: 'translate(-50%,-50%)', pointerEvents: 'none',
                  left: `${fp.x * 100}%`, top: `${fp.y * 100}%`,
                }} />
                {/* crosshairs */}
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, width: 1,
                  background: 'rgba(255,255,255,0.4)', pointerEvents: 'none',
                  left: `${fp.x * 100}%`,
                }} />
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: 1,
                  background: 'rgba(255,255,255,0.4)', pointerEvents: 'none',
                  top: `${fp.y * 100}%`,
                }} />
                {/* coords badge */}
                <div style={{
                  position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)',
                  color: '#fff', fontSize: '0.65rem', padding: '2px 8px', borderRadius: 6,
                  pointerEvents: 'none',
                }}>
                  {Math.round(fp.x * 100)}% / {Math.round(fp.y * 100)}%
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ borderRadius: 12, overflow: 'hidden', background: '#0a1628', position: 'relative' }}>
                <video controls style={{ width: '100%', maxHeight: 220, display: 'block' }}>
                  <source src={preview} />
                </video>
                <div style={{
                  position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)',
                  color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999,
                }}>
                  🎬 Video
                </div>
              </div>

              {onSound && (
                <button type="button" onClick={() => onSound(!soundEnabled)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0.75rem 1rem', borderRadius: 12, cursor: 'pointer',
                  border: `2px solid ${soundEnabled ? '#2563eb' : '#e2e8f0'}`,
                  background: soundEnabled ? '#eff6ff' : '#f8fafc',
                  transition: 'all 0.18s', fontFamily: 'inherit',
                  width: '100%', textAlign: 'left',
                }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: soundEnabled ? '#2563eb' : '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', transition: 'background 0.18s',
                  }}>
                    {soundEnabled ? '🔊' : '🔇'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '0.85rem', fontWeight: 700,
                      color: soundEnabled ? '#1d4ed8' : '#475569', margin: 0
                    }}>
                      {soundEnabled ? 'Sonido activado' : 'Activar sonido para este video'}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '2px 0 0' }}>
                      {soundEnabled
                        ? 'El visitante verá un control para subir/bajar el volumen'
                        : 'El video se reproducirá en silencio (recomendado para fondos)'}
                    </p>
                  </div>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: soundEnabled ? '#2563eb' : '#cbd5e1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', color: '#fff', fontWeight: 700,
                  }}>
                    {soundEnabled ? '✓' : ''}
                  </span>
                </button>
              )}
            </div>
          )}

          {uploading && (
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '0.75rem', color: '#64748b', marginBottom: 4
              }}>
                <span>
                  {progress < 45 ? 'Comprimiendo...'
                    : progress < 100 ? `Subiendo a Cloudinary... ${progress}%`
                      : '¡Listo!'}
                </span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${progress}%`,
                  background: 'linear-gradient(90deg,#1e3a5f,#d4a017)',
                  borderRadius: 3, transition: 'width .3s',
                }} />
              </div>
              {progress < 100 && previewType === 'video' && (
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4, textAlign: 'center' }}>
                  Los videos grandes pueden tardar varios minutos. No cierres esta ventana.
                </p>
              )}
            </div>
          )}

          {/* Badge de calidad post-subida */}
          {!uploading && quality && previewType === 'image' && (() => {
            const saved = Math.round((1 - quality.finalSize / quality.origSize) * 100);
            const dimChanged = quality.finalW !== quality.origW || quality.finalH !== quality.origH;
            const fmt = (b: number) => b >= 1024 * 1024
              ? `${(b / 1024 / 1024).toFixed(1)} MB`
              : `${Math.round(b / 1024)} KB`;
            const isGood = saved >= 20;
            const isWarning = saved > 0 && saved < 20;
            const grew = saved < 0;
            return (
              <div style={{
                background: grew ? '#fff1f2' : isWarning ? '#fffbeb' : '#f0fdf4',
                border: `1px solid ${grew ? '#fecaca' : isWarning ? '#fde68a' : '#bbf7d0'}`,
                borderRadius: 10, padding: '0.6rem 0.875rem',
                fontSize: '0.72rem', color: grew ? '#9f1239' : isWarning ? '#92400e' : '#166534',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
                  <span>{grew ? '⚠️' : isWarning ? '🟡' : '✅'}</span>
                  <span>
                    {grew
                      ? `Archivo creció ${Math.abs(saved)}% — considera comprimir manualmente`
                      : `Comprimida ${saved}% · formato ${quality.format}`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: 'inherit', opacity: 0.85 }}>
                  <span>Original: <strong>{fmt(quality.origSize)}</strong> · {quality.origW}×{quality.origH}px</span>
                  <span>Final: <strong>{fmt(quality.finalSize)}</strong>{dimChanged ? ` · ${quality.finalW}×${quality.finalH}px` : ''}</span>
                </div>
              </div>
            );
          })()}

          {!uploading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button {...getRootProps()} type="button" style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb',
                fontSize: '0.78rem', textDecoration: 'underline', padding: 0, fontFamily: 'inherit',
              }}>
                <input {...getInputProps()} /> Cambiar archivo
              </button>
              {previewType === 'image' && (
                <button type="button" onClick={() => {
                  if (cropFile) setCropSrc(URL.createObjectURL(cropFile));
                  else if (preview) setCropSrc(preview);
                }} style={{
                  background: 'none', border: '1.5px solid #e2e8f0', cursor: 'pointer',
                  color: '#475569', fontSize: '0.78rem', padding: '3px 10px',
                  borderRadius: 8, fontFamily: 'inherit',
                }}>
                  ✂️ Recortar
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p style={{
          fontSize: '0.8rem', color: '#ef4444', background: '#fff1f2',
          border: '1px solid #fecaca', borderRadius: 8,
          padding: '0.5rem 0.75rem', marginTop: 8,
        }}>
          ❌ {error}
        </p>
      )}
    </div>
  );
}
