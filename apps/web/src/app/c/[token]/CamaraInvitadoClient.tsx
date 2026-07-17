'use client';

import { useCallback, useRef, useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CamaraInvitadoLink } from '@/types';

type Step = 'idle' | 'preview-foto' | 'grabando-video' | 'preview-video' | 'subiendo' | 'listo' | 'error';

const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

/** Compone la foto capturada + la plantilla PNG (si está activa) en un canvas. */
async function componerFoto(fotoFile: File, plantillaUrl: string | null): Promise<Blob> {
  const fotoBitmap = await createImageBitmap(fotoFile, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  canvas.width = fotoBitmap.width;
  canvas.height = fotoBitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(fotoBitmap, 0, 0);
  fotoBitmap.close();

  if (plantillaUrl) {
    const plantillaImg = await new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = plantillaUrl;
    });
    if (plantillaImg) {
      // La plantilla cubre el lienzo completo (mismo aspect ratio que la foto final)
      ctx.drawImage(plantillaImg, 0, 0, canvas.width, canvas.height);
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo generar la imagen')), 'image/jpeg', 0.92);
  });
}

export default function CamaraInvitadoClient({ link }: { link: CamaraInvitadoLink }) {
  const [step, setStep] = useState<Step>('idle');
  const [error, setErrorMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingIsVideo, setPendingIsVideo] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  if (!link.activo) {
    return (
      <Shell>
        <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', textAlign: 'center' }}>
          📷 Este álbum ya no está recibiendo fotos
        </p>
        <p style={{ color: 'rgba(255,255,255,.6)', textAlign: 'center', fontSize: '0.9rem' }}>
          Gracias por querer compartir tu foto — el evento ha finalizado.
        </p>
      </Shell>
    );
  }

  const onFotoSeleccionada = async (file: File) => {
    setPendingFile(file);
    setPendingIsVideo(false);
    try {
      const blob = await componerFoto(file, link.plantillaActiva ? (link.plantillaUrl || null) : null);
      setPreviewUrl(URL.createObjectURL(blob));
      setStep('preview-foto');
    } catch {
      setErrorMsg('No se pudo procesar la foto. Intenta de nuevo.');
      setStep('error');
    }
  };

  const onVideoSeleccionado = (file: File) => {
    if (file.size > MAX_VIDEO_BYTES) {
      setErrorMsg(`El video es muy pesado. Grábalo más corto (máx. ${link.videoMaxSegundos}s).`);
      setStep('error');
      return;
    }
    setPendingFile(file);
    setPendingIsVideo(true);
    setPreviewUrl(URL.createObjectURL(file));
    setStep('preview-video');
  };

  const subir = useCallback(async () => {
    if (!pendingFile) return;
    setStep('subiendo');
    try {
      let fileToUpload: File | Blob = pendingFile;
      if (!pendingIsVideo) {
        fileToUpload = await componerFoto(pendingFile, link.plantillaActiva ? (link.plantillaUrl || null) : null);
      }

      const signRes = await fetch('/api/camara-invitado/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: link.token,
          fileSize: fileToUpload.size,
          fileType: pendingIsVideo ? pendingFile.type : 'image/jpeg',
        }),
      });
      if (!signRes.ok) {
        const { error: msg } = await signRes.json().catch(() => ({ error: '' }));
        throw new Error(msg || 'No se pudo autorizar la subida');
      }
      const { timestamp, signature, apiKey, cloudName, folder, albumId, resourceType } = await signRes.json();

      const form = new FormData();
      form.append('file', fileToUpload, pendingIsVideo ? pendingFile.name : 'foto.jpg');
      form.append('api_key', apiKey);
      form.append('timestamp', String(timestamp));
      form.append('signature', signature);
      form.append('folder', folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
        method: 'POST', body: form,
      });
      if (!uploadRes.ok) throw new Error('Error al subir a Cloudinary');
      const { secure_url: url } = await uploadRes.json();

      await addDoc(collection(db, 'gallery_items'), {
        url,
        albumId,
        tipo: pendingIsVideo ? 'video' : 'imagen',
        origen: 'invitado',
        visible: false,
        order: 0,
        createdAt: new Date().toISOString(),
      });

      setStep('listo');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Ocurrió un error al subir. Intenta de nuevo.');
      setStep('error');
    }
  }, [pendingFile, pendingIsVideo, link]);

  const reiniciar = () => {
    setStep('idle');
    setPendingFile(null);
    setPreviewUrl('');
    setErrorMsg('');
  };

  return (
    <Shell>
      <input
        ref={fotoInputRef} type="file" accept="image/*" capture="environment" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) onFotoSeleccionada(f); e.target.value = ''; }}
      />
      {link.permiteVideo && (
        <input
          ref={videoInputRef} type="file" accept="video/*" capture="environment" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) onVideoSeleccionado(f); e.target.value = ''; }}
        />
      )}

      {step === 'idle' && (
        <>
          <p style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, textAlign: 'center', margin: 0 }}>
            {link.albumTitulo || '¡Comparte este momento!'}
          </p>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '0.85rem', textAlign: 'center', margin: '4px 0 20px' }}>
            Tu foto o video se subirá directo al álbum del evento
          </p>
          <BigButton icon="📷" label="Tomar foto" onClick={() => fotoInputRef.current?.click()} />
          {link.permiteVideo && (
            <BigButton icon="🎥" label={`Grabar video (máx ${link.videoMaxSegundos}s)`} onClick={() => videoInputRef.current?.click()} secondary />
          )}
        </>
      )}

      {(step === 'preview-foto' || step === 'preview-video') && (
        <>
          {pendingIsVideo
            ? <video src={previewUrl} controls style={mediaStyle} />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={previewUrl} alt="preview" style={mediaStyle} />
          }
          <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 16 }}>
            <button onClick={reiniciar} style={btnSecondary}>Repetir</button>
            <button onClick={subir} style={btnPrimary}>Enviar al álbum</button>
          </div>
        </>
      )}

      {step === 'subiendo' && (
        <>
          <Spinner />
          <p style={{ color: '#fff', marginTop: 12 }}>Subiendo…</p>
        </>
      )}

      {step === 'listo' && (
        <>
          <p style={{ fontSize: '2.5rem', margin: 0 }}>✅</p>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', textAlign: 'center' }}>¡Gracias por compartir!</p>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '0.85rem', textAlign: 'center' }}>Tu foto ya está en camino al álbum.</p>
          <button onClick={reiniciar} style={{ ...btnPrimary, marginTop: 16 }}>Tomar otra</button>
        </>
      )}

      {step === 'error' && (
        <>
          <p style={{ fontSize: '2.5rem', margin: 0 }}>⚠️</p>
          <p style={{ color: '#fff', textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>
          <button onClick={reiniciar} style={{ ...btnPrimary, marginTop: 16 }}>Intentar de nuevo</button>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100dvh', background: 'linear-gradient(160deg,#050d1a,#0a1628 60%,#1e3a5f)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1.25rem', gap: 8,
    }}>
      {children}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function BigButton({ icon, label, onClick, secondary }: { icon: string; label: string; onClick: () => void; secondary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', maxWidth: 320, padding: '1.1rem', borderRadius: 16, marginTop: 10,
      border: secondary ? '1.5px solid rgba(255,255,255,.25)' : 'none',
      background: secondary ? 'transparent' : 'linear-gradient(135deg,#b8860b,#f5c842)',
      color: secondary ? '#fff' : '#0a1628', fontWeight: 700, fontSize: '1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer',
    }}>
      <span style={{ fontSize: '1.3rem' }}>{icon}</span> {label}
    </button>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 40, height: 40, border: '3px solid rgba(212,160,23,0.3)', borderTopColor: '#d4a017',
      borderRadius: '50%', animation: 'spin .8s linear infinite',
    }} />
  );
}

const mediaStyle: React.CSSProperties = { width: '100%', maxWidth: 340, borderRadius: 16, maxHeight: '60vh', objectFit: 'contain' };
const btnPrimary: React.CSSProperties = { flex: 1, padding: '0.9rem', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#b8860b,#f5c842)', color: '#0a1628', fontWeight: 700, cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { flex: 1, padding: '0.9rem', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.25)', background: 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer' };
