'use client';
/**
 * ImageUploader — sube imágenes Y videos a Cloudinary
 * Cloud name:    dvcmazqtp
 * Upload preset: ybtav8vp  (Unsigned)
 * Límite:        200 MB (foto o video)
 */
import { useState, useCallback } from 'react';
import { useDropzone }           from 'react-dropzone';

const CLOUD  = 'dvcmazqtp';
const PRESET = 'ybtav8vp';

interface FP { x: number; y: number }
interface Props {
  value?:       string;
  focal?:       FP;
  folder?:      string;
  label?:       string;
  onComplete:   (url: string, fp: FP, type?: string) => void;
  onSound?:     (enabled: boolean) => void;
  soundEnabled?: boolean;
  className?:   string;
  acceptVideo?: boolean;
}

const MAX_IMAGE_BYTES = 10  * 1024 * 1024; // 10 MB — límite real Cloudinary Free
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB — límite video Cloudinary Free

export default function ImageUploader({
  value, focal={x:.5,y:.5}, folder='jym',
  label='Imagen', onComplete, onSound, soundEnabled=false,
  className, acceptVideo=true,
}: Props) {
  const [preview,    setPreview]    = useState(value || '');
  const [previewType,setPreviewType] = useState<'image'|'video'>(
    value?.match(/\.(mp4|webm|mov|avi)$/i) ? 'video' : 'image'
  );
  const [fp,        setFp]        = useState<FP>(focal);
  const [progress,  setProgress]  = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  const upload = useCallback(async (file: File) => {
    setError(''); setUploading(true); setProgress(0);

    const isVideo = file.type.startsWith('video/');
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD}/${isVideo ? 'video' : 'image'}/upload`;

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
          });
        } catch { /* Si falla la compresión, sube el original */ }
      }

      setProgress(isVideo ? 5 : 45);

      const url = await new Promise<string>((resolve, reject) => {
        const form = new FormData();
        form.append('file', fileToUpload);
        form.append('upload_preset', PRESET);
        form.append('folder', folder);
        if (!isVideo) {
          form.append('context', `focal_x=${fp.x}|focal_y=${fp.y}`);
        }

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
            const data = JSON.parse(xhr.responseText);
            resolve(data.secure_url);
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err?.error?.message || `Error ${xhr.status}`));
            } catch {
              reject(new Error(`Error HTTP ${xhr.status}`));
            }
          }
        };
        xhr.onerror  = () => reject(new Error('Error de red. Intenta de nuevo.'));
        xhr.onabort  = () => reject(new Error('Subida cancelada.'));
        xhr.send(form);
      });

      setProgress(100);
      setPreview(url);
      setPreviewType(isVideo ? 'video' : 'image');
      onComplete(url, fp, isVideo ? 'video' : 'image');

    } catch(e: any) {
      setError(e?.message || 'Error al subir. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  }, [folder, fp, onComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: acceptVideo
      ? { 'image/*':['.jpg','.jpeg','.png','.webp','.heic'], 'video/*':['.mp4','.webm','.mov'] }
      : { 'image/*':['.jpg','.jpeg','.png','.webp','.heic'] },
    maxSize: MAX_VIDEO_BYTES,
    multiple: false,
    onDrop: (accepted, rejected) => {
      if (rejected.length) {
        const err = rejected[0].errors[0];
        const f   = rejected[0].file;
        const isVid = f.type.startsWith('video/');
        setError(err.code === 'file-too-large'
          ? `El archivo supera el límite (${isVid ? '100 MB para videos' : '100 MB — las imágenes se comprimen automáticamente'}).`
          : 'Formato no válido.');
        return;
      }
      const file = accepted[0];
      setPreview(URL.createObjectURL(file));
      setPreviewType(file.type.startsWith('video/') ? 'video' : 'image');
      upload(file);
    },
  });

  const handleFocalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r  = e.currentTarget.getBoundingClientRect();
    const nfp: FP = {
      x: parseFloat(((e.clientX - r.left)  / r.width ).toFixed(3)),
      y: parseFloat(((e.clientY - r.top)   / r.height).toFixed(3)),
    };
    setFp(nfp);
    if (preview) onComplete(preview, nfp, previewType);
  };

  const op = `${fp.x*100}% ${fp.y*100}%`;
  const sizeLabel = acceptVideo ? 'JPEG · PNG · WebP · HEIC (se comprimen automáticamente) · MP4 · WebM · MOV — Máx 100 MB' : 'JPEG · PNG · WebP · HEIC — se comprimen automáticamente';

  return (
    <div className={className}>
      <p style={{ fontSize:'0.75rem', fontWeight:700, color:'#64748b',
                  textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>
        {label}
      </p>

      {!preview ? (
        <div {...getRootProps()} style={{
          border:`2px dashed ${isDragActive?'#2563eb':'#cbd5e1'}`,
          borderRadius:16, padding:'2rem', textAlign:'center', cursor:'pointer',
          background:isDragActive?'#eff6ff':'#f8fafc', transition:'all 0.2s',
        }}>
          <input {...getInputProps()}/>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>🖼️</div>
          <p style={{ fontSize:'0.85rem', color:'#64748b', margin:0 }}>
            <span style={{ color:'#2563eb', fontWeight:600 }}>Click para seleccionar</span>{' '}
            o arrastra aquí
          </p>
          <p style={{ fontSize:'0.72rem', color:'#94a3b8', marginTop:4 }}>{sizeLabel}</p>
          <p style={{ fontSize:'0.68rem', color:'#c7d2fe', marginTop:4 }}>
            Cloudinary · Sin Firebase Storage · Sin costo adicional
          </p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Preview */}
          {previewType === 'image' ? (
            <div>
              <p style={{ fontSize:'0.72rem', color:'#94a3b8', marginBottom:6 }}>
                📍 Toca para definir el <strong>punto de enfoque</strong>
              </p>
              <div onClick={handleFocalClick} style={{
                position:'relative', borderRadius:12, overflow:'hidden',
                cursor:'crosshair', paddingTop:'56.25%', background:'#e2e8f0',
              }}>
                <img src={preview} alt="" style={{ position:'absolute', inset:0, width:'100%',
                                                    height:'100%', objectFit:'cover', objectPosition:op }}/>
                <div style={{ position:'absolute', width:24, height:24, borderRadius:'50%',
                               border:'3px solid #fff', background:'rgba(212,160,23,0.85)',
                               boxShadow:'0 2px 8px rgba(0,0,0,0.4)',
                               transform:'translate(-50%,-50%)', pointerEvents:'none',
                               left:`${fp.x*100}%`, top:`${fp.y*100}%` }}/>
                <div style={{ position:'absolute', top:0, bottom:0, width:1,
                               background:'rgba(255,255,255,0.4)', pointerEvents:'none',
                               left:`${fp.x*100}%` }}/>
                <div style={{ position:'absolute', left:0, right:0, height:1,
                               background:'rgba(255,255,255,0.4)', pointerEvents:'none',
                               top:`${fp.y*100}%` }}/>
                <div style={{ position:'absolute', bottom:8, right:8, background:'rgba(0,0,0,0.6)',
                               color:'#fff', fontSize:'0.65rem', padding:'2px 8px', borderRadius:6,
                               pointerEvents:'none' }}>
                  {Math.round(fp.x*100)}% / {Math.round(fp.y*100)}%
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ borderRadius:12, overflow:'hidden', background:'#0a1628', position:'relative' }}>
                <video controls style={{ width:'100%', maxHeight:220, display:'block' }}>
                  <source src={preview}/>
                </video>
                <div style={{ position:'absolute', top:8, left:8, background:'rgba(0,0,0,0.7)',
                               color:'#fff', fontSize:'0.7rem', padding:'2px 8px', borderRadius:999 }}>
                  🎬 Video
                </div>
              </div>

              {/* Toggle sonido — solo si hay callback onSound */}
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

          {/* Barra de progreso */}
          {uploading && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem',
                             color:'#64748b', marginBottom:4 }}>
                <span>
                  {progress < 45  ? 'Comprimiendo...'
                  :progress < 100 ? `Subiendo a Cloudinary... ${progress}%`
                  :                 '¡Listo!'}
                </span>
                <span>{progress}%</span>
              </div>
              <div style={{ height:6, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progress}%`,
                               background:'linear-gradient(90deg,#1e3a5f,#d4a017)',
                               borderRadius:3, transition:'width .3s' }}/>
              </div>
              {progress < 100 && previewType === 'video' && (
                <p style={{ fontSize:'0.7rem', color:'#94a3b8', marginTop:4, textAlign:'center' }}>
                  Los videos grandes pueden tardar varios minutos. No cierres esta ventana.
                </p>
              )}
            </div>
          )}

          {!uploading && (
            <button {...getRootProps()} type="button" style={{
              background:'none', border:'none', cursor:'pointer', color:'#2563eb',
              fontSize:'0.78rem', textDecoration:'underline', padding:0, fontFamily:'inherit',
            }}>
              <input {...getInputProps()}/> Cambiar archivo
            </button>
          )}
        </div>
      )}

      {error && (
        <p style={{ fontSize:'0.8rem', color:'#ef4444', background:'#fff1f2',
                     border:'1px solid #fecaca', borderRadius:8,
                     padding:'0.5rem 0.75rem', marginTop:8 }}>
          ❌ {error}
        </p>
      )}
    </div>
  );
}
