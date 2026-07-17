'use client';
// RUTA: apps/admin/src/app/dashboard/camara-invitado/page.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs,
} from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { uploadFile } from '@/lib/upload';
import { useModal } from '@/components/ui/Modal';
import type { CamaraInvitadoLink } from '@/types';
import { Camera, QrCode, ChevronDown, Image as ImageIcon, Video, Download, Power, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import QRCodeStyling from 'qr-code-styling';

// QR estilizado: módulos redondeados en colores de marca con el logo J&M
// incrustado al centro. errorCorrectionLevel 'H' (30% tolerancia) permite
// tapar el centro con el logo sin perder legibilidad.
function crearQrEstilizado(url: string, size = 280) {
  return new QRCodeStyling({
    width: size,
    height: size,
    type: 'svg',
    data: url,
    image: '/logo-watermark.png',
    margin: 8,
    qrOptions: { errorCorrectionLevel: 'H' },
    imageOptions: { crossOrigin: 'anonymous', margin: 6, imageSize: 0.22 },
    dotsOptions: { type: 'rounded', color: '#0a1628' },
    cornersSquareOptions: { type: 'extra-rounded', color: '#b8860b' },
    cornersDotOptions: { type: 'dot', color: '#b8860b' },
    backgroundOptions: { color: '#ffffff' },
  });
}

interface AlbumOpt { id: string; titulo: string; }

function randomToken(): string {
  return Math.random().toString(36).slice(2, 9);
}

export default function CamaraInvitadoPage() {
  const { open } = useModal();
  const [links, setLinks] = useState<CamaraInvitadoLink[]>([]);
  const [albums, setAlbums] = useState<AlbumOpt[]>([]);
  const [albumPickerOpen, setAlbumPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [qrGenerado, setQrGenerado] = useState<Record<string, boolean>>({});
  const [uploadingPlantilla, setUploadingPlantilla] = useState<string | null>(null);
  const qrContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const qrInstances = useRef<Record<string, QRCodeStyling>>({});

  useEffect(() => onSnapshot(
    query(collection(db, COL.CAMARA_INVITADO), orderBy('createdAt', 'desc')),
    snap => setLinks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CamaraInvitadoLink))),
  ), []);

  useEffect(() => {
    getDocs(query(collection(db, COL.ALBUMES), orderBy('order', 'asc'))).then(snap =>
      setAlbums(snap.docs.map(d => ({ id: d.id, titulo: (d.data() as any).titulo || '(sin título)' }))),
    );
  }, []);

  // Álbumes que todavía no tienen un link de cámara invitado creado
  const albumesConLink = new Set(links.map(l => l.albumId));
  const albumesDisponibles = albums.filter(a => !albumesConLink.has(a.id));

  const crearLinkParaAlbum = async (album: AlbumOpt) => {
    setCreating(true);
    try {
      await addDoc(collection(db, COL.CAMARA_INVITADO), {
        albumId: album.id,
        albumTitulo: album.titulo,
        token: randomToken(),
        activo: true,
        plantillaUrl: null,
        plantillaActiva: false,
        permiteVideo: true,
        videoMaxSegundos: 15,
        createdAt: new Date().toISOString(),
      });
      toast.success(`Cámara creada para "${album.titulo}"`);
      setAlbumPickerOpen(false);
    } catch {
      toast.error('No se pudo crear la cámara del invitado');
    } finally {
      setCreating(false);
    }
  };

  const toggleActivo = async (link: CamaraInvitadoLink) => {
    await updateDoc(doc(db, COL.CAMARA_INVITADO, link.id!), { activo: !link.activo });
    toast.success(!link.activo ? 'QR reactivado' : 'QR desactivado — ya no recibirá fotos');
  };

  const handleDelete = (link: CamaraInvitadoLink) => open({
    type: 'delete',
    title: 'Eliminar cámara de invitado',
    description: `Se elimina la cámara del álbum "${link.albumTitulo || link.albumId}". El QR impreso dejará de funcionar.`,
    onConfirm: async () => {
      await deleteDoc(doc(db, COL.CAMARA_INVITADO, link.id!));
      toast.success('Cámara de invitado eliminada');
    },
  });

  const togglePlantilla = async (link: CamaraInvitadoLink) => {
    if (!link.plantillaUrl) { toast.error('Primero sube una plantilla/marco'); return; }
    await updateDoc(doc(db, COL.CAMARA_INVITADO, link.id!), { plantillaActiva: !link.plantillaActiva });
  };

  const subirPlantilla = async (link: CamaraInvitadoLink, file: File) => {
    setUploadingPlantilla(link.id!);
    try {
      const url = await uploadFile(file, `plantillas-camara/${link.albumId}`);
      await updateDoc(doc(db, COL.CAMARA_INVITADO, link.id!), { plantillaUrl: url, plantillaActiva: true });
      toast.success('Plantilla subida y activada');
    } catch {
      toast.error('No se pudo subir la plantilla');
    } finally {
      setUploadingPlantilla(null);
    }
  };

  const generarQr = useCallback(async (link: CamaraInvitadoLink) => {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jmdecoracionesyeventos.com';
      const targetUrl = `${siteUrl.replace(/\/$/, '')}/c/${link.token}`;
      const qr = crearQrEstilizado(targetUrl, 82);
      qrInstances.current[link.id!] = qr;
      const container = qrContainerRefs.current[link.id!];
      if (container) {
        container.innerHTML = '';
        qr.append(container);
      }
      setQrGenerado(prev => ({ ...prev, [link.id!]: true }));
    } catch {
      toast.error('No se pudo generar el QR');
    }
  }, []);

  const descargarQr = (link: CamaraInvitadoLink) => {
    const qr = qrInstances.current[link.id!];
    if (!qr) return;
    qr.update({ width: 1000, height: 1000 });
    qr.download({ name: `qr-camara-${link.albumTitulo || link.token}`, extension: 'png' });
    qr.update({ width: 82, height: 82 });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.6rem', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Camera size={24} /> Cámara Web del Invitado
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0' }}>
          Genera un QR por álbum para que tus invitados tomen fotos/videos desde su celular y se suban directo a la galería del evento.
        </p>
      </div>

      {/* Selector desglosable de álbumes existentes */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <button
          onClick={() => setAlbumPickerOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0.9rem 1.25rem',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}>
          <QrCode size={18} color="#2563eb" />
          <span style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
            Elegir álbum existente para generar su cámara
          </span>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{albumesDisponibles.length} disponible(s)</span>
          <ChevronDown size={16} style={{ transform: albumPickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: '#64748b' }} />
        </button>
        {albumPickerOpen && (
          <div style={{ borderTop: '1px solid #e2e8f0', padding: '0.5rem' }}>
            {albumesDisponibles.length === 0 && (
              <p style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Todos tus álbumes ya tienen una cámara asignada, o aún no has creado ningún álbum en Galería.
              </p>
            )}
            {albumesDisponibles.map(a => (
              <button
                key={a.id}
                disabled={creating}
                onClick={() => crearLinkParaAlbum(a)}
                style={{
                  width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: 10,
                  border: 'none', background: 'transparent', cursor: creating ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem', color: '#334155', fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                🎉 {a.titulo}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de cámaras / QRs activos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {links.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Aún no has creado ninguna cámara de invitado.</p>
        )}
        {links.map(link => (
          <div key={link.id} style={{
            background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '1.25rem',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', flex: 1 }}>
                🎉 {link.albumTitulo || link.albumId}
              </span>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                background: link.activo ? '#dcfce7' : '#fee2e2',
                color: link.activo ? '#166534' : '#991b1b',
              }}>
                {link.activo ? 'ACTIVO' : 'DESACTIVADO'}
              </span>
              <button
                onClick={() => toggleActivo(link)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.8rem', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 600, color: link.activo ? '#991b1b' : '#166534',
                }}>
                <Power size={13} /> {link.activo ? 'Desactivar QR' : 'Reactivar QR'}
              </button>
              <button
                onClick={() => handleDelete(link)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.8rem', borderRadius: 8,
                  border: '1.5px solid #fecaca', background: '#fff', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 600, color: '#991b1b',
                }}>
                <Trash2 size={13} /> Eliminar
              </button>
            </div>

            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
              URL pública: <code>/c/{link.token}</code>
            </p>

            {/* Plantilla / marco */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
              <ImageIcon size={15} color="#64748b" />
              <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Plantilla/marco (opcional)</span>
              {link.plantillaUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={link.plantillaUrl} alt="plantilla" style={{ height: 32, borderRadius: 6, border: '1px solid #e2e8f0' }} />
              )}
              <label style={{
                fontSize: '0.72rem', color: '#2563eb', cursor: 'pointer', fontWeight: 600,
                opacity: uploadingPlantilla === link.id ? 0.5 : 1,
              }}>
                {uploadingPlantilla === link.id ? 'Subiendo…' : (link.plantillaUrl ? 'Cambiar plantilla' : 'Subir plantilla PNG')}
                <input
                  type="file" accept="image/png,image/webp" hidden
                  disabled={uploadingPlantilla === link.id}
                  onChange={e => { const f = e.target.files?.[0]; if (f) subirPlantilla(link, f); e.target.value = ''; }}
                />
              </label>
              {link.plantillaUrl && (
                <button
                  onClick={() => togglePlantilla(link)}
                  style={{
                    marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                    border: 'none', cursor: 'pointer',
                    background: link.plantillaActiva ? '#dbeafe' : '#f1f5f9',
                    color: link.plantillaActiva ? '#1d4ed8' : '#64748b',
                  }}>
                  {link.plantillaActiva ? 'Plantilla activada' : 'Plantilla desactivada'}
                </button>
              )}
            </div>

            {/* Video */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', color: '#475569' }}>
              <Video size={15} color="#64748b" />
              <span style={{ fontWeight: 600 }}>Videos de hasta {link.videoMaxSegundos}s</span>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{link.permiteVideo ? '(permitidos)' : '(deshabilitados)'}</span>
            </div>

            {/* QR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
              <button
                onClick={() => generarQr(link)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 10,
                  border: 'none', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', color: '#fff',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                }}>
                <QrCode size={15} /> Generar QR
              </button>
              <div
                ref={el => { qrContainerRefs.current[link.id!] = el; }}
                style={{
                  width: 90, height: 90, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                  padding: 4, display: qrGenerado[link.id!] ? 'flex' : 'none',
                  alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}
              />
              {qrGenerado[link.id!] && (
                <button
                  onClick={() => descargarQr(link)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.9rem', borderRadius: 10,
                    border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer',
                    fontSize: '0.78rem', fontWeight: 600, color: '#334155',
                  }}>
                  <Download size={14} /> Descargar PNG
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
