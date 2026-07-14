'use client';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { toast } from 'sonner';
import Link from 'next/link';
import { useModal } from '@/components/ui/Modal';
import ImageUploader from '@/components/ui/ImageUploader';
import IconPicker from '@/components/ui/IconPicker';
import { Plus, Eye, EyeOff, Trash2, Edit2, Check, X, GripVertical } from 'lucide-react';
import { SERVICE_ICONS, isIconKey } from '@/lib/serviceIcons';

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const { open } = useModal();

  useEffect(() => onSnapshot(
    query(collection(db, COL.SERVICIOS), orderBy('order', 'asc')),
    snap => { setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
  ), []);

  const startEdit = (s: any) => {
    setEditingId(s.id);
    const currentSlug = s.link
      ? s.link.replace('servicios/', '').replace('.html', '')
      : s.id;
    setEditData({ title: s.title, icon: s.icon || 'party', desc: s.desc || '', order: s.order || 1, slug: currentSlug });
  };

  const cancelEdit = () => { setEditingId(null); setEditData({}); };

  const saveEdit = async (id: string) => {
    if (!editData.title?.trim()) { toast.error('El nombre es requerido'); return; }
    const cleanSlug = (editData.slug || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!cleanSlug) { toast.error('La URL no puede estar vacía'); return; }
    const payload: any = {
      title: editData.title.trim(),
      icon: editData.icon,
      desc: editData.desc,
      order: Number(editData.order) || 1,
      link: `servicios/${cleanSlug}.html`,
    };
    if (editData.mediaSrc) payload.mediaSrc = editData.mediaSrc;
    if (editData.mediaType) payload.mediaType = editData.mediaType;
    payload.mediaSound = !!editData.mediaSound;
    await updateDoc(doc(db, COL.SERVICIOS, id), payload);
    toast.success('Servicio actualizado');
    cancelEdit();
  };

  const toggleVisible = (s: any) => open({
    type: s.visible ? 'hide' : 'show',
    title: s.visible ? `Ocultar "${s.title}"` : `Mostrar "${s.title}"`,
    description: s.visible
      ? 'Dejará de aparecer en el navbar y la web.'
      : 'Volverá a aparecer en el navbar y la web.',
    collection: COL.SERVICIOS, docId: s.id, field: 'visible',
  });

  const handleDelete = (s: any) => open({
    type: 'delete', title: `Eliminar "${s.title}"`,
    description: 'Esta acción no se puede deshacer.',
    onConfirm: async () => { await deleteDoc(doc(db, COL.SERVICIOS, s.id)); toast.success('Eliminado'); },
  });

  const getSlugUrl = (s: any) => {
    if (s.link) return `/servicios/${s.link.replace('servicios/', '').replace('.html', '')}`;
    return `/servicios/${s.id}`;
  };

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-h1" style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', fontWeight: 700, color: '#0a1628', margin: 0 }}>
            Servicios
          </h1>
          <p className="page-h1-sub" style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 4 }}>
            {servicios.filter(s => s.visible).length} activos · Toca ✏️ para editar nombre, ícono o descripción
          </p>
        </div>
        <Link href="/dashboard/servicios/nuevo" className="btn-primary" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <Plus size={16} /> Nuevo
        </Link>
      </div>

      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12,
        padding: '0.875rem 1.25rem', display: 'flex', gap: 10
      }}>
        <span>💡</span>
        <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: 0 }}>
          Usa ✏️ para editar el nombre, ícono, descripción y orden de cualquier servicio existente.
          Los cambios se reflejan en el navbar automáticamente.
        </p>
      </div>

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />)}
          </div>
        ) : servicios.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <p style={{ fontSize: '3rem', marginBottom: 12 }}>🎭</p>
            <p style={{ color: '#64748b', marginBottom: 16 }}>No hay servicios aún</p>
            <Link href="/dashboard/servicios/nuevo" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
              <Plus size={16} /> Crear primer servicio
            </Link>
          </div>
        ) : (
          <div>
            {servicios.map(s => (
              <div key={s.id}
                style={{
                  borderBottom: '1px solid #f1f5f9', padding: '1rem 1.25rem',
                  background: editingId === s.id ? '#fafbff' : '#fff', transition: 'background .2s'
                }}>

                {editingId === s.id ? (
                  /* ── Modo edición ── */
                  <div>
                    <div className="grid-edit-service" style={{ marginBottom: 16 }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>Ícono</label>
                        <IconPicker value={editData.icon} onChange={v => setEditData((p: any) => ({ ...p, icon: v }))} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>Nombre *</label>
                        <input type="text" value={editData.title}
                          onChange={e => setEditData((p: any) => ({ ...p, title: e.target.value }))}
                          className="admin-input" style={{ fontSize: '0.95rem', padding: '0.7rem 0.9rem' }} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                          URL pública del servicio
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                          <span style={{ padding: '0.7rem 0.9rem', background: '#f1f5f9', color: '#64748b', fontSize: '0.88rem', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            /servicios/
                          </span>
                          <input
                            type="text"
                            value={editData.slug || ''}
                            onChange={e => setEditData((p: any) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') }))}
                            className="admin-input"
                            style={{ border: 'none', borderRadius: 0, background: 'transparent', flex: 1, fontSize: '0.95rem', padding: '0.7rem 0.9rem' }}
                            placeholder="bm-vogue"
                          />
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 6 }}>
                          URL final: <strong style={{ color:'#475569' }}>/servicios/{editData.slug || '…'}</strong>
                        </p>
                      </div>
                      <div className="col-desc">
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>Descripción</label>
                        <textarea rows={2} value={editData.desc}
                          onChange={e => setEditData((p: any) => ({ ...p, desc: e.target.value }))}
                          className="admin-input" style={{ resize: 'vertical', fontSize: '0.95rem', padding: '0.7rem 0.9rem', lineHeight: 1.5 }} placeholder="Breve descripción…" />
                      </div>
                      <div className="col-order">
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>Orden</label>
                        <input type="number" value={editData.order}
                          onChange={e => setEditData((p: any) => ({ ...p, order: +e.target.value }))}
                          className="admin-input" style={{ padding: '0.7rem 0.9rem', fontSize: '0.95rem' }} />
                      </div>
                    </div>

                    {/* Subir nueva media */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
                        Imagen / Video de portada (opcional — máx 200MB)
                      </label>
                      <ImageUploader folder={`servicios/${s.id}`} acceptVideo={true}
                        value={editData.mediaSrc || s.mediaSrc}
                        soundEnabled={!!(editData.mediaSound ?? s.mediaSound)}
                        onSound={v => setEditData((p: any) => ({ ...p, mediaSound: v }))}
                        previewAspect={4 / 3} previewLabel="Tarjeta de servicio (paisaje)"
                        onComplete={(url, _fp, type) => {
                          setEditData((p: any) => ({ ...p, mediaSrc: url, mediaType: type || 'image' }));
                        }} />
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => saveEdit(s.id)} className="btn-gold"
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} /> Guardar cambios
                      </button>
                      <button onClick={cancelEdit} className="btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <X size={14} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Modo vista ── */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <GripVertical size={14} /> {s.order ?? 0}
                    </span>

                    {/* Thumbnail */}
                    <div style={{
                      width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                      background: 'linear-gradient(135deg,#0a1628,#1e3a5f)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem'
                    }}>
                      {s.mediaSrc
                        ? (s.mediaType === 'video'
                          ? <video src={s.mediaSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <img src={s.mediaSrc} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)
                        : isIconKey(s.icon)
                          ? (() => { const Icon = SERVICE_ICONS[s.icon]; return <Icon size={22} color="#f5c842" />; })()
                          : (s.icon || 'party')}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: '#0a1628', fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isIconKey(s.icon)
                          ? (() => { const Icon = SERVICE_ICONS[s.icon]; return <Icon size={15} color="#d4a017" />; })()
                          : <span>{s.icon}</span>}
                        {s.title}
                      </p>
                      {s.desc && (
                        <p style={{
                          color: '#94a3b8', fontSize: '0.75rem', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {s.desc}
                        </p>
                      )}
                      <code style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{getSlugUrl(s)}</code>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 'auto' }}>
                      <span className={s.visible ? 'badge badge-green' : 'badge badge-slate'}>
                        {s.visible ? '✓ Visible' : '○ Oculto'}
                      </span>
                      <button onClick={() => startEdit(s)} title="Editar"
                        style={{
                          padding: '8px 10px', background: '#eff6ff', border: '1px solid #bfdbfe',
                          borderRadius: 8, color: '#1e40af', cursor: 'pointer', display: 'flex', alignItems: 'center',
                          minWidth: 36, minHeight: 36, justifyContent: 'center'
                        }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => toggleVisible(s)} title={s.visible ? 'Ocultar' : 'Mostrar'}
                        style={{
                          padding: '8px 10px', background: s.visible ? '#fffbeb' : '#f0fdf4',
                          border: `1px solid ${s.visible ? '#fde68a' : '#bbf7d0'}`,
                          borderRadius: 8, color: s.visible ? '#92400e' : '#166534',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                          minWidth: 36, minHeight: 36, justifyContent: 'center'
                        }}>
                        {s.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => handleDelete(s)} title="Eliminar"
                        style={{
                          padding: '8px 10px', background: '#fff1f2', border: '1px solid #fecaca',
                          borderRadius: 8, color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center',
                          minWidth: 36, minHeight: 36, justifyContent: 'center'
                        }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
