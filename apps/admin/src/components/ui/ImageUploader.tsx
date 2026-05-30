'use client';
/**
 * ImageUploader — sube imágenes Y videos a Cloudinary
 * Cloud name:    dvcmazqtp
 * Upload preset: ybtav8vp  (Unsigned)
 * Límite:        200 MB (foto o video)
 *
 * Para imágenes: muestra un modal de recorte (react-image-crop) antes de subir.
 */
import { useState, useCallback, useRef } from 'react';
import { useDropzone }                   from 'react-dropzone';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const CLOUD  = 'dvcmazqtp';
const PRESET = 'ybtav8vp';

interface FP { x: number; y: number }
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
  /** Relación de aspecto para el crop. undefined = libre */
  cropAspect?:   number;
}

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/* ─── helpers ─── */
function initCrop(aspect?: number): Crop {
  if (!aspect) return { unit: '%', x: 5, y: 5, width: 90, height: 90 };
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, 1, 1),
    1, 1,
  );
}

async function cropToBlob(img: HTMLImageElement, px: PixelCrop): Promise<Blob> {
  const canvas  = document.createElement('canvas');
  const scaleX  = img.naturalWidth  / img.width;
  const scaleY  = img.naturalHeight / img.height;
  canvas.width  = px.width  * scaleX;
  canvas.height = px.height * scaleY;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    img,
    px.x * scaleX, px.y * scaleY,
    px.width * scaleX, px.height * scaleY,
    0, 0, canvas.width, canvas.height,
  );
  return new Promise((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error('canvas toBlob failed')), 'image/webp', 0.9),
  );
}

/* ─── component ─── */
export default function ImageUploader({
  value, focal = { x: .5, y: .5 }, folder = 'jym',
  label = 'Imagen', onComplete, onSound, soundEnabled = false,
  className, acceptVideo = true, cropAspect,
}: Props) {
  const [preview,     setPreview]     = useState(value || '');
  const [previewType, setPreviewType] = useState<'image' | 'video'>(
    value?.match(/\.(mp4|webm|mov|avi)$/i) ? 'video' : 'image',
  );
  const [fp,        setFp]        = useState<FP>(focal);
  const [progress,  setProgress]  = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  /* ── crop state ── */
  const [cropSrc,    setCropSrc]    = useState('');   // blob URL for crop modal
  const [cropFile,   setCropFile]   = useState<File | null>(null);
  const [crop,       setCrop]       = useState<Crop>(initCrop(cropAspect));
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  /* ─────────────────────────────────────────── upload ── */
  const upload = useCallback(async (file: File) => {
    setError(''); setUploading(true); setProgress(0);

    const isVideo   = file.type.startsWith('video/');
    const endpoint  = `https://api.cloudinary.com/v1_1/${CLOUD}/${isVideo ? 'video' : 'image'}/upload`;

    try {
      let fileToUpload = file;
      if (!isVideo) {
        try {
          const { default: imageCompression } = await import('browser-image-compression');
          setProgress(10);
          fileToUpload = await imageCompression(file, {
            maxSizeMB: 8, maxWidthOrHeight: 2400,
            useWebWorker: true, fileType: 'image/webp', initialQuality: 0.85,
            onProgress: p => setProgress(10 + Math.round(p * 0.3)),
          }) as File;
        } catch { /* Si falla la compresión, sube el original */ }
      }

      setProgress(isVideo ? 5 : 45);

      const url = await new Promise<string>((resolve, reject) => {
        const form = new FormData();
        form.append('file', fileToUpload);
        form.append('upload_preset', PRESET);
        form.append('folder', folder);
        if (!isVideo) form.append('context', `focal_x=${fp.x}|focal_y=${fp.y}`);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = isVideo
              ? Math.round(e.loaded / e.total * 90)
              : 45 + Math.round(e.loaded / e.total * 50);
            setProgress(pct);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText).secure_url);
          } else {
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
      onComplete(url, fp, isVideo ? 'video' : 'image');

    } catch (e: any) {
      setError(e?.message || 'Error al subir. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  }, [folder, fp, onComplete]);

  /* ─────────────────────────────────────── dropzone ── */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: acceptVideo
      ? { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'], 'video/*': ['.mp4', '.webm', '.mov'] }
      : { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize: MAX_VIDEO_BYTES,
    multiple: false,
    onDrop: (accepted, rejected) => {
      if (rejected.length) {
        const err = rejected[0].errors[0];
        setError(err.code === 'file-too-large' ? 'El archivo supera el límite.' : 'Formato no válido.');
        return;
      }
      const file = accepted[0];
      if (file.type.startsWith('video/')) {
        setPreview(URL.createObjectURL(file));
        setPreviewType('video');
        upload(file);
      } else {
        // Imagen → abrir modal de recorte
        setCropFile(file);
        setCropSrc(URL.createObjectURL(file));
        setCrop(initCrop(cropAspect));
        setCompletedCrop(null);
      }
    },
  });

  /* ── focal point click (post-upload) ── */
  const handleFocalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const nfp: FP = {
      x: parseFloat(((e.clientX - r.left)  / r.width ).toFixed(3)),
      y: parseFloat(((e.clientY - r.top)   / r.height).toFixed(3)),
    };
    setFp(nfp);
    if (preview) onComplete(preview, nfp, previewType);
  };

  /* ── apply crop ── */
  const applyCrop = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !cropFile) return;
    try {
      const blob    = await cropToBlob(imgRef.current, completedCrop);
      const cropped = new File([blob], cropFile.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' });
      const localUrl = URL.createObjectURL(cropped);
      setPreview(localUrl);
      setPreviewType('image');
      setCropSrc('');
      // Centrar focal point en el área recortada
      const cx = completedCrop.x + completedCrop.width  / 2;
      const cy = completedCrop.y + completedCrop.height / 2;
      const newFp = {
        x: parseFloat((cx / imgRef.current.width ).toFixed(3)),
        y: parseFloat((cy / imgRef.current.height).toFixed(3)),
      };
      setFp(newFp);
      upload(cropped);
    } catch (e: any) {
      setError(e?.message || 'Error al recortar.');
    }
  }, [completedCrop, cropFile, upload]);

  const skipCrop = () => {
    if (!cropFile) return;
    setCropSrc('');
    setPreview(URL.createObjectURL(cropFile));
    setPreviewType('image');
    upload(cropFile);
  };

  const op         = `${fp.x * 100}% ${fp.y * 100}%`;
  const sizeLabel  = acceptVideo
    ? 'JPEG · PNG · WebP · HEIC (se comprimen) · MP4 · WebM · MOV — Máx 100 MB'
    : 'JPEG · PNG · WebP · HEIC — se comprimen automáticamente';

  /* ══════════════════════════════════════════════ render ══ */
  return (
    <div className={className}>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
        {label}
      </p>

      {/* ── CROP MODAL ── */}
      {cropSrc && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, overflow: 'hidden',
            maxWidth: 680, width: '100%', boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column', maxHeight: '90vh',
          }}>
            {/* header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', margin: 0 }}>
                  ✂️ Recortar / ajustar imagen
                </p>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0, marginTop: 2 }}>
                  Arrastra y redimensiona el área de recorte
                </p>
              </div>
              <button onClick={skipCrop} style={{ background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1 }}>✕</button>
            </div>

            {/* crop area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem',
                          background: '#0f172a', display: 'flex',
                          alignItems: 'center', justifyContent: 'center' }}>
              <ReactCrop
                crop={crop}
                onChange={(c: Crop) => setCrop(c)}
                onComplete={(c: PixelCrop) => setCompletedCrop(c)}
                aspect={cropAspect}
                minWidth={20}
                minHeight={20}
                style={{ maxWidth: '100%', maxHeight: '60vh' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={cropSrc}
                  alt="crop"
                  style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block' }}
                  onLoad={(e) => {
                    const { width, height } = e.currentTarget;
                    setCrop(centerCrop(
                      makeAspectCrop(
                        cropAspect
                          ? { unit: '%', width: 90 }
                          : { unit: '%', x: 5, y: 5, width: 90, height: 90 },
                        cropAspect ?? width / height,
                        width, height,
                      ),
                      width, height,
                    ));
                  }}
                />
              </ReactCrop>
            </div>

            {/* crop info */}
            {completedCrop && (
              <div style={{ padding: '0.5rem 1.5rem', background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.72rem', color: '#64748b' }}>
                <span>X: <strong>{Math.round(completedCrop.x)}px</strong></span>
                <span>Y: <strong>{Math.round(completedCrop.y)}px</strong></span>
                <span>Ancho: <strong>{Math.round(completedCrop.width)}px</strong></span>
                <span>Alto: <strong>{Math.round(completedCrop.height)}px</strong></span>
              </div>
            )}

            {/* actions */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0',
                          display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={skipCrop} type="button" style={{
                padding: '0.6rem 1.2rem', borderRadius: 10, border: '1.5px solid #e2e8f0',
                background: '#fff', cursor: 'pointer', fontSize: '0.85rem', color: '#475569',
                fontFamily: 'inherit', fontWeight: 600,
              }}>
                Usar sin recortar
              </button>
              <button onClick={applyCrop} type="button" disabled={!completedCrop} style={{
                padding: '0.6rem 1.4rem', borderRadius: 10, border: 'none',
                background: completedCrop ? 'linear-gradient(135deg,#1e3a5f,#2563eb)' : '#cbd5e1',
                color: '#fff', cursor: completedCrop ? 'pointer' : 'not-allowed',
                fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 700,
              }}>
                ✓ Aplicar recorte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DROP ZONE / PREVIEW ── */}
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
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 6 }}>
                📍 Toca para ajustar el <strong>punto de enfoque</strong>
              </p>
              <div onClick={handleFocalClick} style={{
                position: 'relative', borderRadius: 12, overflow: 'hidden',
                cursor: 'crosshair', paddingTop: '56.25%', background: '#e2e8f0',
              }}>
                <img src={preview} alt="" style={{
                  position: 'absolute', inset: 0, width: '100%',
                  height: '100%', objectFit: 'cover', objectPosition: op,
                }} />
                <div style={{
                  position: 'absolute', width: 24, height: 24, borderRadius: '50%',
                  border: '3px solid #fff', background: 'rgba(212,160,23,0.85)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  transform: 'translate(-50%,-50%)', pointerEvents: 'none',
                  left: `${fp.x * 100}%`, top: `${fp.y * 100}%`,
                }} />
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
                <button
                  type="button"
                  onClick={() => onSound(!soundEnabled)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0.75rem 1rem', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${soundEnabled ? '#2563eb' : '#e2e8f0'}`,
                    background: soundEnabled ? '#eff6ff' : '#f8fafc',
                    transition: 'all 0.18s', fontFamily: 'inherit',
                    width: '100%', textAlign: 'left',
                  }}
                >
                  <span style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: soundEnabled ? '#2563eb' : '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', transition: 'background 0.18s',
                  }}>
                    {soundEnabled ? '🔊' : '🔇'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: soundEnabled ? '#1d4ed8' : '#475569', margin: 0 }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem',
                            color: '#64748b', marginBottom: 4 }}>
                <span>
                  {progress < 45  ? 'Comprimiendo...'
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

          {!uploading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button {...getRootProps()} type="button" style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb',
                fontSize: '0.78rem', textDecoration: 'underline', padding: 0, fontFamily: 'inherit',
              }}>
                <input {...getInputProps()} /> Cambiar archivo
              </button>
              {previewType === 'image' && (
                <button
                  type="button"
                  onClick={() => {
                    if (cropFile) {
                      setCropSrc(URL.createObjectURL(cropFile));
                    } else if (preview) {
                      setCropSrc(preview);
                    }
                    setCrop(initCrop(cropAspect));
                    setCompletedCrop(null);
                  }}
                  style={{
                    background: 'none', border: '1.5px solid #e2e8f0', cursor: 'pointer',
                    color: '#475569', fontSize: '0.78rem', padding: '3px 10px',
                    borderRadius: 8, fontFamily: 'inherit',
                  }}
                >
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
