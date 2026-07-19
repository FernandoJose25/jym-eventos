'use client';
// RUTA: apps/admin/src/app/dashboard/redes-sociales/page.tsx
// Controla el contenido de la página pública redes.jmdecoracionesyeventos.com
// (app standalone en apps/redes) que lee este mismo documento de Firestore.
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { toast } from 'sonner';
import { Share2, Instagram, Facebook, MessageCircle, Music2, QrCode, Download } from 'lucide-react';

const DOC_ID = 'main';
const REDES_URL = 'https://redes.jmdecoracionesyeventos.com';

// Mismo generador "sello dorado" que usa la Cámara del Invitado — ver
// src/lib/qrArtistico.ts. v=3 mantiene el mismo diseño ya validado.
function urlQrArtistico(url: string, size: number): string {
  return `/api/qr-artistico?data=${encodeURIComponent(url)}&size=${size}&v=3`;
}

const DEFAULT_REDES = {
  titulo: 'J&M Decoraciones y Eventos',
  subtitulo: 'Síguenos y no te pierdas nuestros eventos ✨',
  instagram: 'https://www.instagram.com/jmdecoracionesyeventos1/',
  facebook: 'https://www.facebook.com/JM.DecoracionesyEventosSechura1/',
  tiktok: 'https://www.tiktok.com/@jmdecoraciones.18',
  whatsapp: '51945203708',
};

const lbl = (text: string) => (
  <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
    {text}
  </label>
);

function F({ label, icon: Icon, value, onChange, placeholder }: {
  label: string; icon: any; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      {lbl(label)}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} color="#64748b" style={{ flexShrink: 0 }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} className="admin-input" />
      </div>
    </div>
  );
}

export default function RedesSocialesPage() {
  const [data, setData] = useState<Record<string, string>>(DEFAULT_REDES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(doc(db, COL.REDES_SOCIALES, DOC_ID)).then(snap => {
      if (snap.exists()) setData({ ...DEFAULT_REDES, ...snap.data() });
      setLoading(false);
    });
  }, []);

  const set = (k: string, v: string) => setData(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await setDoc(doc(db, COL.REDES_SOCIALES, DOC_ID), data, { merge: true });
    setSaving(false);
    toast.success('✅ Guardado. La página redes.jmdecoracionesyeventos.com ya está actualizada.');
  };

  if (loading) return <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Cargando…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 640 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.6rem', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Share2 size={24} /> Redes Sociales
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0' }}>
          Edita aquí los enlaces que se muestran en <code>redes.jmdecoracionesyeventos.com</code>, la página del QR que dirige a tus clientes a seguirte en redes.
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <F label="Título" icon={Share2} value={data.titulo} onChange={v => set('titulo', v)} placeholder="J&M Decoraciones y Eventos" />
        <F label="Subtítulo" icon={Share2} value={data.subtitulo} onChange={v => set('subtitulo', v)} placeholder="Síguenos en nuestras redes" />
        <F label="Instagram (link completo)" icon={Instagram} value={data.instagram} onChange={v => set('instagram', v)} placeholder="https://www.instagram.com/usuario/" />
        <F label="TikTok (link completo)" icon={Music2} value={data.tiktok} onChange={v => set('tiktok', v)} placeholder="https://www.tiktok.com/@usuario" />
        <F label="Facebook (link completo)" icon={Facebook} value={data.facebook} onChange={v => set('facebook', v)} placeholder="https://www.facebook.com/pagina/" />
        <F label="WhatsApp (solo número, con código de país)" icon={MessageCircle} value={data.whatsapp} onChange={v => set('whatsapp', v)} placeholder="51945203708" />

        <button onClick={handleSave} disabled={saving} className="btn-outline"
          style={{
            alignSelf: 'flex-start', padding: '0.6rem 1.4rem', borderRadius: 10,
            background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', color: '#fff', border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.85rem',
          }}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCode size={16} /> QR para imprimir
          </p>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
            Apunta a <code>{REDES_URL}</code>, listo para poner en la tarjeta del evento.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlQrArtistico(REDES_URL, 400)}
            alt="QR de Redes Sociales"
            style={{ width: 180, height: 180, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 4, objectFit: 'contain' }}
          />
          <a
            href={urlQrArtistico(REDES_URL, 1000)}
            download="qr-redes-sociales-jym.png"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.9rem', borderRadius: 10,
              border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 600, color: '#334155', textDecoration: 'none',
            }}>
            <Download size={14} /> Descargar PNG
          </a>
        </div>
      </div>
    </div>
  );
}
