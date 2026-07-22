'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { Bell, X, Sparkles, ChevronRight } from 'lucide-react';

interface Sugerencia {
  titulo: string; detalle: string;
  prioridad: 'alta' | 'media' | 'baja'; href?: string;
}

const PRIORIDAD_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  alta:  { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
  media: { bg: '#fffbeb', text: '#92400e', dot: '#f59e0b' },
  baja:  { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6' },
};

/**
 * Panel desplegable del botón 🔔. Al abrirse pide sugerencias a /api/sugerencias
 * (reglas sobre Firestore + redacción por IA). El badge rojo refleja los
 * mensajes sin leer que ya calcula el layout (prop `unread`), no las sugerencias.
 */
export default function SugerenciasPanel({ user, unread }: { user: User; unread: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sugerencias, setSugerencias] = useState<Sugerencia[] | null>(null);
  const [fuente, setFuente] = useState<'ia' | 'reglas' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const cargar = async () => {
    setLoading(true); setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/sugerencias', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('respuesta no OK');
      const data = await res.json();
      setSugerencias(Array.isArray(data.sugerencias) ? data.sugerencias : []);
      setFuente(data.fuente ?? null);
    } catch {
      setError('No se pudieron cargar las sugerencias. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar al abrir (siempre refresca para reflejar el estado actual).
  useEffect(() => { if (open) cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);

  // Cerrar al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} aria-label="Sugerencias del asistente"
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 6, minWidth: 32, minHeight: 32 }}>
        <Bell size={18} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 999, background: '#ef4444', color: '#fff', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="sugerencias-dropdown" style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 340, maxWidth: 'calc(100vw - 24px)',
          background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
          boxShadow: '0 12px 40px rgba(10,22,40,0.18)', zIndex: 50, overflow: 'hidden',
        }}>
          {/* Cabecera */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.875rem 1rem', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg,#0a1628,#1e3a5f)' }}>
            <Sparkles size={16} style={{ color: '#f5c842' }} />
            <span style={{ flex: 1, color: '#fff', fontSize: '0.88rem', fontWeight: 700 }}>Asistente</span>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', padding: 2 }}>
              <X size={16} />
            </button>
          </div>

          {/* Cuerpo */}
          <div style={{ maxHeight: 'min(420px, 60vh)', overflowY: 'auto', padding: '0.5rem' }}>
            {loading && (
              <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                Analizando tu panel…
              </div>
            )}
            {!loading && error && (
              <div style={{ padding: '1rem', textAlign: 'center' }}>
                <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '0 0 8px' }}>{error}</p>
                <button onClick={cargar} className="btn-outline" style={{ fontSize: '0.78rem', padding: '0.35rem 0.875rem' }}>Reintentar</button>
              </div>
            )}
            {!loading && !error && sugerencias?.length === 0 && (
              <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>✅</div>
                <p style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600, margin: '0 0 2px' }}>¡Todo al día!</p>
                <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: 0 }}>No hay nada pendiente por ahora.</p>
              </div>
            )}
            {!loading && !error && sugerencias?.map((s, i) => {
              const c = PRIORIDAD_COLOR[s.prioridad] || PRIORIDAD_COLOR.media;
              const inner = (
                <div style={{ display: 'flex', gap: 10, padding: '0.7rem 0.75rem', borderRadius: 10, background: c.bg, transition: 'transform .12s' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: c.dot, flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.83rem', fontWeight: 700, color: c.text, margin: '0 0 2px' }}>{s.titulo}</p>
                    <p style={{ fontSize: '0.76rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>{s.detalle}</p>
                  </div>
                  {s.href && <ChevronRight size={15} style={{ color: c.text, flexShrink: 0, alignSelf: 'center', opacity: 0.6 }} />}
                </div>
              );
              return (
                <div key={i} style={{ marginBottom: 4 }}>
                  {s.href
                    ? <Link href={s.href} onClick={() => setOpen(false)} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
                    : inner}
                </div>
              );
            })}
          </div>

          {/* Pie: origen de las sugerencias */}
          {!loading && !error && fuente && (
            <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                {fuente === 'ia' ? '✨ Priorizado por IA' : 'Basado en el estado de tu panel'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
