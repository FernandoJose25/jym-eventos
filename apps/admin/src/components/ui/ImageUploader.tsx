'use client';
/**
 * ImageUploader — sube imágenes Y videos a Cloudinary
 * Cloud name:    dvcmazqtp
 * Upload preset: ybtav8vp  (Unsigned)
 *
 * Para imágenes: muestra un modal de recorte nativo (sin librerías externas).
 */
import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

const CLOUD  = 'dvcmazqtp';
const PRESET = 'ybtav8vp';

interface FP { x: number; y: number }
interface CropBox { x: number; y: number; w: number; h: number }

interface Props {
  value?:        string;
  focal?:        FP;
  folder?:       string;
  label?:        string;
  onComplete:    (url: string, fp: FP, type?: string) => void;
  onSound?:      (enabled: boolean) => void;
  soundEnabled?: boolean;
  className?:    string;
  acceptVideo?:  boolean;
  /** Relación de aspecto fija para el crop. undefined = libre */
  cropAspect?:   number;
  /**
   * Relación de aspecto (ancho/alto) del bloque en la web pública donde
   * se mostrará esta imagen. Controla la forma del previsualizador de
   * punto de enfoque. Ejemplos: 16/9, 1, 3/4, 3/1.
   * Por defecto: 16/9.
   */
  previewAspect?: number;
  /** Etiqueta corta que describe el bloque destino, p.ej. "Banner hero" */
  previewLabel?:  string;
}

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/* ─── canvas crop ─── */
async function applyCropToFile(
  img: HTMLImageElement,
  box: CropBox,
  displayW: number,
  displayH: number,
  fileName: string,
): Promise<File> {
  const scaleX = img.naturalWidth  / displayW;
  const scaleY = img.naturalHeight / displayH;
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(box.w * scaleX);
  canvas.height = Math.round(box.h * scaleY);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    img,
    Math.round(box.x * scaleX), Math.round(box.y * scaleY),
    canvas.width, canvas.height,
    0, 0, canvas.width, canvas.height,
  );
  // try WebP first, fall back to PNG (some browsers block WebP toBlob on certain origins)
  const blob = await new Promise<Blob>((res, rej) => {
    canvas.toBlob(b => {
      if (b) { res(b); return; }
      canvas.toBlob(b2 => b2 ? res(b2) : rej(new Error('toBlob failed')), 'image/png');
    }, 'image/webp', 0.92);
  });
  const ext  = blob.type === 'image/webp' ? '.webp' : '.png';
  return new File([blob], fileName.replace(/\.\w+$/, ext), { type: blob.type });
}

/* ─── crop modal ─── */
type Handle = 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'move'|null;

function CropModal({
  src,
  aspect,
  onApply,
  onSkip,
}: {
  src:     string;
  aspect?: number;
  /** Debe retornar Promise<void>; rechaza con Error en caso de fallo. */
  onApply: (box: CropBox, displayW: number, displayH: number, img: HTMLImageElement) => Promise<void>;
  onSkip:  () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);
  const [imgSize,   setImgSize]   = useState({ w: 0, h: 0 });
  const [box,       setBox]       = useState<CropBox>({ x: 0, y: 0, w: 0, h: 0 });
  const [applying,  setApplying]  = useState(false);
  const [applyErr,  setApplyErr]  = useState('');
  const dragRef = useRef<{
    handle: Handle;
    startX: number; startY: number;
    origBox: CropBox;
  } | null>(null);

  const initBox = useCallback((w: number, h: number) => {
    if (aspect) {
      const bw = w * 0.9;
      const bh = bw / aspect;
      const bh2 = Math.min(bh, h * 0.9);
      const bw2 = bh2 * aspect;
      setBox({ x: (w - bw2) / 2, y: (h - bh2) / 2, w: bw2, h: bh2 });
    } else {
      const pad = Math.min(w, h) * 0.05;
      setBox({ x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 });
    }
  }, [aspect]);

  const onImgLoad = () => {
    const img = imgRef.current!;
    setImgSize({ w: img.offsetWidth, h: img.offsetHeight });
    initBox(img.offsetWidth, img.offsetHeight);
  };

  const onPointerDown = (e: React.PointerEvent, handle: Handle) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      handle,
      startX: e.clientX, startY: e.clientY,
      origBox: { ...box },
    };
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { handle, startX, startY, origBox } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const { w: iw, h: ih } = imgSize;
    const MIN = 20;

    setBox(() => {
      let { x, y, w, h } = origBox;
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

      if (handle === 'move') {
        x = clamp(x + dx, 0, iw - w);
        y = clamp(y + dy, 0, ih - h);
      } else {
        if (handle?.includes('e')) { w = clamp(w + dx, MIN, iw - x); }
        if (handle?.includes('s')) { h = clamp(h + dy, MIN, ih - y); }
        if (handle?.includes('w')) {
          const nw = clamp(w - dx, MIN, x + w);
          x = x + w - nw; w = nw;
        }
        if (handle?.includes('n')) {
          const nh = clamp(h - dy, MIN, y + h);
          y = y + h - nh; h = nh;
        }
        if (aspect) {
          if (handle?.includes('e') || handle?.includes('w')) {
            h = clamp(w / aspect, MIN, ih - y);
          } else {
            w = clamp(h * aspect, MIN, iw - x);
          }
        }
      }
      return { x, y, w, h };
    });
  }, [imgSize, aspect]);

  const onPointerUp = () => { dragRef.current = null; };

  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    setBox(prev => {
      const nx = Math.max(0, Math.min(mx - prev.w / 2, imgSize.w - prev.w));
      const ny = Math.max(0, Math.min(my - prev.h / 2, imgSize.h - prev.h));
      return { ...prev, x: nx, y: ny };
    });
  };

  const handleApply = async () => {
    if (!imgRef.current || applying) return;
    setApplyErr('');
    setApplying(true);
    try {
      await onApply(box, imgSize.w, imgSize.h, imgRef.current);
      // Si llegamos aquí sin error el padre ya llamó setCropSrc('') → modal se cierra
    } catch (e: any) {
      setApplyErr(e?.message || 'Error al recortar. Intenta de nuevo.');
      setApplying(false);
    }
  };

  const handles: { id: Handle; cursor: string; style: React.CSSProperties }[] = [
    { id:'nw', cursor:'nw-resize', style:{ top:-6, left:-6 } },
    { id:'n',  cursor:'n-resize',  style:{ top:-6, left:'calc(50% - 6px)' } },
    { id:'ne', cursor:'ne-resize', style:{ top:-6, right:-6 } },
    { id:'e',  cursor:'e-resize',  style:{ top:'calc(50% - 6px)', right:-6 } },
    { id:'se', cursor:'se-resize', style:{ bottom:-6, right:-6 } },
    { id:'s',  cursor:'s-resize',  style:{ bottom:-6, left:'calc(50% - 6px)' } },
    { id:'sw', cursor:'sw-resize', style:{ bottom:-6, left:-6 } },
    { id:'w',  cursor:'w-resize',  style:{ top:'calc(50% - 6px)', left:-6 } },
  ];

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'rgba(0,0,0,0.82)', display:'flex',
      alignItems:'center', justifyContent:'center', padding:'1rem',
    }}>
      <div style={{
        background:'#fff', borderRadius:20, overflow:'hidden',
        maxWidth:700, width:'100%', boxShadow:'0 32px 64px rgba(0,0,0,0.5)',
        display:'flex', flexDirection:'column', maxHeight:'92vh',
      }}>
        {/* header */}
        <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid #e2e8f0',
                      display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <p style={{ fontWeight:700, fontSize:'1rem', color:'#0f172a', margin:0 }}>
              ✂️ Recortar / ajustar imagen
            </p>
            <p style={{ fontSize:'0.72rem', color:'#94a3b8', margin:0, marginTop:2 }}>
              Arrastra las esquinas o bordes para recortar · Mueve el área para reposicionar
            </p>
          </div>
          <button onClick={onSkip} type="button" disabled={applying} style={{
            background:'none', border:'none', cursor:'pointer',
            fontSize:'1.3rem', color:'#94a3b8', lineHeight:1, padding:4,
          }}>✕</button>
        </div>

        {/* canvas area */}
        <div style={{ flex:1, overflowY:'auto', padding:'1rem',
                      background:'#0d1117', display:'flex',
                      alignItems:'center', justifyContent:'center' }}>
          <div
            ref={containerRef}
            onClick={onOverlayClick}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ position:'relative', display:'inline-block',
                     userSelect:'none', lineHeight:0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="crop"
              onLoad={onImgLoad}
              draggable={false}
              style={{ maxWidth:'100%', maxHeight:'60vh', display:'block',
                       opacity:.55, pointerEvents:'none' }}
            />

            {imgSize.w > 0 && (
              <>
                {[
                  { top:0, left:0, width:'100%', height:box.y },
                  { top:box.y+box.h, left:0, width:'100%', bottom:0 },
                  { top:box.y, left:0, width:box.x, height:box.h },
                  { top:box.y, left:box.x+box.w, right:0, height:box.h },
                ].map((s, i) => (
                  <div key={i} style={{ position:'absolute', background:'rgba(0,0,0,0.55)',
                                         pointerEvents:'none', ...s as React.CSSProperties }} />
                ))}

                <div
                  onPointerDown={e => onPointerDown(e, 'move')}
                  style={{
                    position:'absolute',
                    left:box.x, top:box.y, width:box.w, height:box.h,
                    border:'2px solid #fff',
                    boxShadow:'0 0 0 1px rgba(0,0,0,0.5)',
                    cursor:'move', boxSizing:'border-box',
                  }}
                >
                  {[1,2].map(n => (
                    <div key={`v${n}`} style={{ position:'absolute', top:0, bottom:0, width:1,
                                                 left:`${n*33.33}%`, background:'rgba(255,255,255,0.3)' }}/>
                  ))}
                  {[1,2].map(n => (
                    <div key={`h${n}`} style={{ position:'absolute', left:0, right:0, height:1,
                                                 top:`${n*33.33}%`, background:'rgba(255,255,255,0.3)' }}/>
                  ))}

                  {handles.map(({ id, cursor, style }) => (
                    <div
                      key={id}
                      onPointerDown={e => onPointerDown(e, id)}
                      style={{
                        position:'absolute', width:13, height:13,
                        background:'#fff', border:'2px solid #1e3a5f',
                        borderRadius:3, cursor, ...style,
                        boxShadow:'0 1px 4px rgba(0,0,0,0.5)',
                      }}
                    />
                  ))}
                </div>

                <div style={{
                  position:'absolute',
                  left: box.x + box.w / 2,
                  top: box.y + box.h + 8,
                  transform:'translateX(-50%)',
                  background:'rgba(0,0,0,0.7)', color:'#fff',
                  fontSize:'0.65rem', padding:'2px 8px', borderRadius:6,
                  pointerEvents:'none', whiteSpace:'nowrap',
                }}>
                  {Math.round(box.w)} × {Math.round(box.h)} px
                </div>
              </>
            )}
          </div>
        </div>

        {/* info row */}
        <div style={{ padding:'0.5rem 1.5rem', background:'#f8fafc',
                      borderTop:'1px solid #e2e8f0', display:'flex',
                      gap:20, flexWrap:'wrap', fontSize:'0.72rem', color:'#64748b', flexShrink:0 }}>
          <span>X: <strong>{Math.round(box.x)}</strong></span>
          <span>Y: <strong>{Math.round(box.y)}</strong></span>
          <span>Ancho: <strong>{Math.round(box.w)}</strong></span>
          <span>Alto: <strong>{Math.round(box.h)}</strong></span>
          {aspect && <span style={{ color:'#94a3b8' }}>Relación: {aspect.toFixed(2)}</span>}
        </div>

        {/* footer */}
        <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid #e2e8f0',
                      display:'flex', gap:10, alignItems:'center', justifyContent:'flex-end', flexShrink:0, flexWrap:'wrap' }}>
          {applyErr && (
            <p style={{ flex:1, margin:0, fontSize:'0.78rem', color:'#ef4444',
                        background:'#fff1f2', border:'1px solid #fecaca',
                        borderRadius:8, padding:'4px 10px' }}>
              ❌ {applyErr}
            </p>
          )}
          <button onClick={onSkip} type="button" disabled={applying} style={{
            padding:'0.6rem 1.2rem', borderRadius:10, border:'1.5px solid #e2e8f0',
            background:'#fff', cursor: applying ? 'not-allowed' : 'pointer',
            fontSize:'0.85rem', color:'#475569',
            fontFamily:'inherit', fontWeight:600, opacity: applying ? 0.5 : 1,
          }}>
            Usar sin recortar
          </button>
          <button onClick={handleApply} type="button" disabled={applying} style={{
            padding:'0.6rem 1.4rem', borderRadius:10, border:'none',
            background: applying
              ? 'linear-gradient(135deg,#4b6a8f,#6b93d6)'
              : 'linear-gradient(135deg,#1e3a5f,#2563eb)',
            color:'#fff', cursor: applying ? 'not-allowed' : 'pointer',
            fontSize:'0.85rem', fontFamily:'inherit', fontWeight:700,
            display:'flex', alignItems:'center', gap:8,
          }}>
            {applying ? (
              <>
                <span style={{
                  width:14, height:14, borderRadius:'50%',
                  border:'2px solid rgba(255,255,255,0.3)',
                  borderTopColor:'#fff',
                  animation:'spin .7s linear infinite',
                  display:'inline-block', flexShrink:0,
                }}/>
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

/* ══════════════════════════════════════════ main component ══ */
export default function ImageUploader({
  value, focal = { x:.5, y:.5 }, folder = 'jym',
  label = 'Imagen', onComplete, onSound, soundEnabled = false,
  className, acceptVideo = true, cropAspect,
  previewAspect = 16 / 9,
  previewLabel,
}: Props) {
  const [preview,     setPreview]     = useState(value || '');
  const [previewType, setPreviewType] = useState<'image'|'video'>(
    value?.match(/\.(mp4|webm|mov|avi)$/i) ? 'video' : 'image',
  );
  const [fp,        setFp]        = useState<FP>(focal);
  const [progress,  setProgress]  = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  const [cropSrc,  setCropSrc]  = useState('');
  const [cropFile, setCropFile] = useState<File | null>(null);

  /* ── upload ── */
  const upload = useCallback(async (file: File, currentFp?: FP) => {
    const useFp = currentFp ?? fp;
    setError(''); setUploading(true); setProgress(0);
    const isVideo  = file.type.startsWith('video/');
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD}/${isVideo ? 'video' : 'image'}/upload`;

    try {
      let fileToUpload = file;
      if (!isVideo) {
        try {
          const { default: imageCompression } = await import('browser-image-compression');
          setProgress(10);
          fileToUpload = await imageCompression(file, {
            maxSizeMB:8, maxWidthOrHeight:2400,
            useWebWorker:true, fileType:'image/webp', initialQuality:0.85,
            onProgress: p => setProgress(10 + Math.round(p * 0.3)),
          }) as File;
        } catch { /* falla compresión → sube original */ }
      }
      setProgress(isVideo ? 5 : 45);

      const url = await new Promise<string>((resolve, reject) => {
        const form = new FormData();
        form.append('file', fileToUpload);
        form.append('upload_preset', PRESET);
        form.append('folder', folder);
        if (!isVideo) form.append('context', `focal_x=${useFp.x}|focal_y=${useFp.y}`);

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
        xhr.onerror = () => reject(new Error('Error de red. Intenta de nuevo.'));
        xhr.onabort = () => reject(new Error('Subida cancelada.'));
        xhr.send(form);
      });

      setProgress(100);
      setPreview(url);
      setPreviewType(isVideo ? 'video' : 'image');
      onComplete(url, useFp, isVideo ? 'video' : 'image');
    } catch (e: any) {
      setError(e?.message || 'Error al subir. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  }, [folder, fp, onComplete]);

  /* ── dropzone ── */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: acceptVideo
      ? { 'image/*':['.jpg','.jpeg','.png','.webp','.heic'], 'video/*':['.mp4','.webm','.mov'] }
      : { 'image/*':['.jpg','.jpeg','.png','.webp','.heic'] },
    maxSize: MAX_VIDEO_BYTES,
    multiple: false,
    onDrop: (accepted, rejected) => {
      if (rejected.length) {
        setError(rejected[0].errors[0].code === 'file-too-large'
          ? 'El archivo supera el límite.' : 'Formato no válido.');
        return;
      }
      const file = accepted[0];
      if (file.type.startsWith('video/')) {
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
      x: parseFloat(((e.clientX - r.left) / r.width ).toFixed(3)),
      y: parseFloat(((e.clientY - r.top)  / r.height).toFixed(3)),
    };
    setFp(nfp);
    if (preview) onComplete(preview, nfp, previewType);
  };

  /* ── crop apply — no try/catch: errores los maneja CropModal ── */
  const handleCropApply = useCallback(async (
    box: CropBox, displayW: number, displayH: number, img: HTMLImageElement,
  ): Promise<void> => {
    const newFp: FP = {
      x: parseFloat(((box.x + box.w / 2) / displayW).toFixed(3)),
      y: parseFloat(((box.y + box.h / 2) / displayH).toFixed(3)),
    };
    setFp(newFp);
    const cropped = await applyCropToFile(img, box, displayW, displayH,
      cropFile?.name ?? 'image.webp');
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

  const op        = `${fp.x * 100}% ${fp.y * 100}%`;
  const sizeLabel = acceptVideo
    ? 'JPEG · PNG · WebP · HEIC (se comprimen) · MP4 · WebM · MOV — Máx 100 MB'
    : 'JPEG · PNG · WebP · HEIC — se comprimen automáticamente';

  /* paddingTop trick para mantener aspect ratio */
  const previewPadding = `${(1 / previewAspect) * 100}%`;

  return (
    <div className={className}>
      <p style={{ fontSize:'0.75rem', fontWeight:700, color:'#64748b',
                  textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>
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
          border:`2px dashed ${isDragActive ? '#2563eb' : '#cbd5e1'}`,
          borderRadius:16, padding:'2rem', textAlign:'center', cursor:'pointer',
          background:isDragActive ? '#eff6ff' : '#f8fafc', transition:'all 0.2s',
        }}>
          <input {...getInputProps()} />
          <div style={{ fontSize:'2rem', marginBottom:8 }}>🖼️</div>
          <p style={{ fontSize:'0.85rem', color:'#64748b', margin:0 }}>
            <span style={{ color:'#2563eb', fontWeight:600 }}>Click para seleccionar</span>{' '}
            o arrastra aquí
          </p>
          <p style={{ fontSize:'0.72rem', color:'#94a3b8', marginTop:4 }}>{sizeLabel}</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {previewType === 'image' ? (
            <div>
              {/* hint row */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                            marginBottom:6, gap:8, flexWrap:'wrap' }}>
                <p style={{ fontSize:'0.72rem', color:'#94a3b8', margin:0 }}>
                  📍 Toca para ajustar el <strong>punto de enfoque</strong>
                </p>
                {previewLabel && (
                  <span style={{
                    fontSize:'0.65rem', fontWeight:600, color:'#1e3a5f',
                    background:'rgba(30,58,95,0.08)', border:'1px solid rgba(30,58,95,0.15)',
                    borderRadius:6, padding:'2px 8px', whiteSpace:'nowrap',
                  }}>
                    Vista previa · {previewLabel}
                  </span>
                )}
              </div>

              {/* preview container — usa previewAspect para coincidir con el bloque real */}
              <div onClick={handleFocalClick} style={{
                position:'relative', borderRadius:12, overflow:'hidden',
                cursor:'crosshair', paddingTop: previewPadding, background:'#e2e8f0',
              }}>
                <img src={preview} alt="" style={{
                  position:'absolute', inset:0, width:'100%',
                  height:'100%', objectFit:'cover', objectPosition:op,
                }} />

                {/* punto de enfoque */}
                <div style={{
                  position:'absolute', width:24, height:24, borderRadius:'50%',
                  border:'3px solid #fff', background:'rgba(212,160,23,0.85)',
                  boxShadow:'0 2px 8px rgba(0,0,0,0.4)',
                  transform:'translate(-50%,-50%)', pointerEvents:'none',
                  left:`${fp.x*100}%`, top:`${fp.y*100}%`,
                }} />
                {/* crosshairs */}
                <div style={{
                  position:'absolute', top:0, bottom:0, width:1,
                  background:'rgba(255,255,255,0.4)', pointerEvents:'none',
                  left:`${fp.x*100}%`,
                }} />
                <div style={{
                  position:'absolute', left:0, right:0, height:1,
                  background:'rgba(255,255,255,0.4)', pointerEvents:'none',
                  top:`${fp.y*100}%`,
                }} />
                {/* coords badge */}
                <div style={{
                  position:'absolute', bottom:8, right:8, background:'rgba(0,0,0,0.6)',
                  color:'#fff', fontSize:'0.65rem', padding:'2px 8px', borderRadius:6,
                  pointerEvents:'none',
                }}>
                  {Math.round(fp.x*100)}% / {Math.round(fp.y*100)}%
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ borderRadius:12, overflow:'hidden', background:'#0a1628', position:'relative' }}>
                <video controls style={{ width:'100%', maxHeight:220, display:'block' }}>
                  <source src={preview} />
                </video>
                <div style={{
                  position:'absolute', top:8, left:8, background:'rgba(0,0,0,0.7)',
                  color:'#fff', fontSize:'0.7rem', padding:'2px 8px', borderRadius:999,
                }}>
                  🎬 Video
                </div>
              </div>

              {onSound && (
                <button type="button" onClick={() => onSound(!soundEnabled)} style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'0.75rem 1rem', borderRadius:12, cursor:'pointer',
                  border:`2px solid ${soundEnabled ? '#2563eb' : '#e2e8f0'}`,
                  background:soundEnabled ? '#eff6ff' : '#f8fafc',
                  transition:'all 0.18s', fontFamily:'inherit',
                  width:'100%', textAlign:'left',
                }}>
                  <span style={{
                    width:36, height:36, borderRadius:10, flexShrink:0,
                    background:soundEnabled ? '#2563eb' : '#e2e8f0',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'1.1rem', transition:'background 0.18s',
                  }}>
                    {soundEnabled ? '🔊' : '🔇'}
                  </span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:'0.85rem', fontWeight:700,
                                color:soundEnabled ? '#1d4ed8' : '#475569', margin:0 }}>
                      {soundEnabled ? 'Sonido activado' : 'Activar sonido para este video'}
                    </p>
                    <p style={{ fontSize:'0.72rem', color:'#94a3b8', margin:'2px 0 0' }}>
                      {soundEnabled
                        ? 'El visitante verá un control para subir/bajar el volumen'
                        : 'El video se reproducirá en silencio (recomendado para fondos)'}
                    </p>
                  </div>
                  <span style={{
                    width:20, height:20, borderRadius:'50%', flexShrink:0,
                    background:soundEnabled ? '#2563eb' : '#cbd5e1',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.7rem', color:'#fff', fontWeight:700,
                  }}>
                    {soundEnabled ? '✓' : ''}
                  </span>
                </button>
              )}
            </div>
          )}

          {uploading && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between',
                            fontSize:'0.75rem', color:'#64748b', marginBottom:4 }}>
                <span>
                  {progress < 45  ? 'Comprimiendo...'
                  : progress < 100 ? `Subiendo a Cloudinary... ${progress}%`
                  : '¡Listo!'}
                </span>
                <span>{progress}%</span>
              </div>
              <div style={{ height:6, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
                <div style={{
                  height:'100%', width:`${progress}%`,
                  background:'linear-gradient(90deg,#1e3a5f,#d4a017)',
                  borderRadius:3, transition:'width .3s',
                }} />
              </div>
              {progress < 100 && previewType === 'video' && (
                <p style={{ fontSize:'0.7rem', color:'#94a3b8', marginTop:4, textAlign:'center' }}>
                  Los videos grandes pueden tardar varios minutos. No cierres esta ventana.
                </p>
              )}
            </div>
          )}

          {!uploading && (
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              <button {...getRootProps()} type="button" style={{
                background:'none', border:'none', cursor:'pointer', color:'#2563eb',
                fontSize:'0.78rem', textDecoration:'underline', padding:0, fontFamily:'inherit',
              }}>
                <input {...getInputProps()} /> Cambiar archivo
              </button>
              {previewType === 'image' && (
                <button type="button" onClick={() => {
                  if (cropFile) setCropSrc(URL.createObjectURL(cropFile));
                  else if (preview) setCropSrc(preview);
                }} style={{
                  background:'none', border:'1.5px solid #e2e8f0', cursor:'pointer',
                  color:'#475569', fontSize:'0.78rem', padding:'3px 10px',
                  borderRadius:8, fontFamily:'inherit',
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
          fontSize:'0.8rem', color:'#ef4444', background:'#fff1f2',
          border:'1px solid #fecaca', borderRadius:8,
          padding:'0.5rem 0.75rem', marginTop:8,
        }}>
          ❌ {error}
        </p>
      )}
    </div>
  );
}
