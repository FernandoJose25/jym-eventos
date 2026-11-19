'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Rocket } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authHeaders } from '@/lib/get-token';
import { CANALES, type AppVersionConfig, type Canal } from '@/lib/publisher-shared';

/**
 * Versiones de CASTREAM por canal. Lo que se publica aquí es lo que la app
 * lee de Supabase (app_config) al abrir: por debajo de la mínima, el modal es
 * bloqueante; por debajo de la última, es opcional (salvo "Forzar").
 */

const CANAL_INFO: Record<Canal, { label: string; desc: string }> = {
  'android-sideload': { label: 'Android (APK directo)', desc: 'El modal descarga el APK de la URL y abre el instalador.' },
  'android-play':     { label: 'Android (Play Store)',  desc: 'Se actualiza por la API de Play; la URL no se usa.' },
  'windows':          { label: 'Windows (.exe)',        desc: 'electron-updater descarga e instala al reiniciar.' },
};

interface CanalData {
  canal: Canal;
  actual: AppVersionConfig | null;
  historial: (AppVersionConfig & { id: number })[];
}

const vacio = { latestVersion: '', minVersion: '', downloadUrl: '', changelog: '', forceUpdate: false };

const lbl: React.CSSProperties = {
  fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em',
  color: '#64748b', display: 'block', marginBottom: 6,
};

export default function VersionesPage() {
  const { isAdmin } = useAuth();
  const [canales, setCanales] = useState<CanalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [canal, setCanal] = useState<Canal>('android-sideload');
  const [form, setForm] = useState(vacio);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/publisher/versions', { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCanales(data.canales);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudieron cargar las versiones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isAdmin) cargar(); }, [isAdmin, cargar]);

  // Al cambiar de canal, el formulario parte de la versión vigente (con la URL vacía si es otro binario).
  useEffect(() => {
    const actual = canales.find(c => c.canal === canal)?.actual;
    setForm(actual
      ? { ...vacio, latestVersion: actual.latest_version, minVersion: actual.min_version }
      : vacio);
  }, [canal, canales]);

  const publicar = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/publisher/versions', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          channel: canal,
          latestVersion: form.latestVersion.trim(),
          minVersion: form.minVersion.trim(),
          downloadUrl: form.downloadUrl.trim(),
          changelog: form.changelog.split('\n'),
          forceUpdate: form.forceUpdate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Versión ${form.latestVersion} publicada en ${CANAL_INFO[canal].label}`);
      await cargar();
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo publicar');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <p style={{ fontSize: '3rem', marginBottom: 12 }}>🔒</p>
      <p style={{ color: '#64748b' }}>Solo el administrador puede publicar versiones.</p>
    </div>
  );

  const actual = canales.find(c => c.canal === canal);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', fontWeight: 700, color: '#0a1628', margin: 0 }}>Versiones</h1>
        <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 4 }}>
          CASTREAM: lo que publiques aquí lo ve la app al abrir y decide si muestra el aviso de actualización.
        </p>
      </div>

      {/* Vigente por canal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 20 }}>
        {CANALES.map(c => {
          const a = canales.find(x => x.canal === c)?.actual;
          const activo = c === canal;
          return (
            <button key={c} onClick={() => setCanal(c)} className="admin-card"
              style={{
                textAlign: 'left', padding: '1rem', cursor: 'pointer',
                border: activo ? '2px solid #d4a017' : '2px solid transparent',
              }}>
              <p style={{ ...lbl, marginBottom: 4 }}>{CANAL_INFO[c].label}</p>
              {loading ? <div className="skeleton" style={{ height: 22, borderRadius: 6 }} /> : a ? (
                <>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0a1628', margin: 0 }}>v{a.latest_version}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                    Mínima {a.min_version}{a.force_update ? ' · forzada' : ''} · {new Date(a.published_at).toLocaleDateString('es-PE')}
                  </p>
                </>
              ) : <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>Sin versiones</p>}
            </button>
          );
        })}
      </div>

      {/* Publicar */}
      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: 20 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0a1628', margin: '0 0 4px' }}>
          Publicar en {CANAL_INFO[canal].label}
        </h3>
        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 16px' }}>{CANAL_INFO[canal].desc}</p>
        <div className="cfg-2col">
          <div>
            <label style={lbl}>Última versión</label>
            <input value={form.latestVersion} onChange={e => setForm(f => ({ ...f, latestVersion: e.target.value }))} placeholder="0.1.1" className="admin-input" />
          </div>
          <div>
            <label style={lbl}>Versión mínima (por debajo, el aviso no se puede cerrar)</label>
            <input value={form.minVersion} onChange={e => setForm(f => ({ ...f, minVersion: e.target.value }))} placeholder="0.1.0" className="admin-input" />
          </div>
        </div>
        {canal !== 'android-play' && (
          <div style={{ marginTop: 14 }}>
            <label style={lbl}>URL de descarga del binario (https, pública)</label>
            <input value={form.downloadUrl} onChange={e => setForm(f => ({ ...f, downloadUrl: e.target.value }))}
              placeholder="https://github.com/…/releases/download/v0.1.1/castream.apk" className="admin-input" />
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <label style={lbl}>Novedades (una por línea)</label>
          <textarea value={form.changelog} onChange={e => setForm(f => ({ ...f, changelog: e.target.value }))} rows={4}
            placeholder={'Nueva pantalla de calendario\nCorrige el corte del Live'} className="admin-input" />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: '0.85rem', color: '#0a1628', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.forceUpdate} onChange={e => setForm(f => ({ ...f, forceUpdate: e.target.checked }))} />
          Forzar: el aviso no se puede cerrar aunque la versión instalada sea mayor que la mínima
        </label>
        <button onClick={publicar} disabled={saving} className="btn-gold" style={{ marginTop: 18, opacity: saving ? 0.6 : 1 }}>
          <Rocket size={15} /> {saving ? 'Publicando…' : 'Publicar versión'}
        </button>
      </div>

      {/* Historial */}
      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table" style={{ minWidth: 600 }}>
            <thead><tr><th>Versión</th><th>Mínima</th><th>Novedades</th><th>Publicada</th></tr></thead>
            <tbody>
              {(actual?.historial ?? []).map(h => (
                <tr key={h.id}>
                  <td style={{ fontWeight: 600 }}>v{h.latest_version}{h.force_update ? ' · forzada' : ''}</td>
                  <td>{h.min_version}</td>
                  <td style={{ fontSize: '0.8rem', color: '#475569' }}>{h.changelog.join(' · ') || '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(h.published_at).toLocaleString('es-PE')}</td>
                </tr>
              ))}
              {!loading && !actual?.historial.length && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>Aún no hay versiones en este canal</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
