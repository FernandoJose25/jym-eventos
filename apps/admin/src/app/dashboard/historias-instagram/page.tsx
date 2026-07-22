'use client';
// RUTA: apps/admin/src/app/dashboard/historias-instagram/page.tsx
// Historias tipo Instagram para la home (solo mobile, arriba del Hero): cada
// documento agrupa varias fotos/videos YA EXISTENTES de la Galería en una
// "historia destacada" con su propio círculo de portada, que en la web se
// reproducen en secuencia (una tras otra) igual que el patrón de Instagram.
// No se sube contenido nuevo aquí — todo sale de `gallery_items`.
import { useState, useEffect, useMemo } from 'react';
import {
  collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc,
} from 'firebase/firestore';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cxThumb, cxVideo } from '@/lib/cloudinary';
import { db, COL } from '@/lib/firebase';
import { toast } from 'sonner';
import { useModal } from '@/components/ui/Modal';
import {
  Plus, Eye, EyeOff, Trash2, Pencil, X, GripVertical, Search, Check, Instagram,
} from 'lucide-react';
import { getToken } from '@/lib/get-token';
import { revalidarWeb } from '@/lib/revalidateWeb';

interface GalleryItem {
  id: string; url: string; alt?: string; categoria?: string; tipo?: string;
  focalX?: number; focalY?: number; visible?: boolean;
}

interface StoryItemRef { galleryItemId: string; }

interface Story {
  id: string; titulo: string; emoji: string; visible: boolean; order: number;
  items: StoryItemRef[];
}

const BLANK = { titulo: '', emoji: '✨', visible: true, items: [] as StoryItemRef[] };

export default function HistoriasInstagramPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [galeria, setGaleria] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'idle' | 'add' | 'edit'>('idle');
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<typeof BLANK>(BLANK);
  const [pickerQ, setPickerQ] = useState('');
  const [pickerSoloVideos, setPickerSoloVideos] = useState(false);
  const { open } = useModal();

  useEffect(() => onSnapshot(
    query(collection(db, COL.HISTORIAS_INSTAGRAM), orderBy('order', 'asc')),
    snap => { setStories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Story))); setLoading(false); }
  ), []);

  useEffect(() => onSnapshot(
    query(collection(db, COL.GALERIA), orderBy('order', 'asc')),
    snap => setGaleria(snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem)))
  ), []);

  const galeriaPorId = useMemo(() => {
    const map = new Map<string, GalleryItem>();
    galeria.forEach(g => map.set(g.id, g));
    return map;
  }, [galeria]);

  const galeriaFiltrada = useMemo(() => {
    let list = galeria.filter(g => g.visible !== false && g.url);
    if (pickerSoloVideos) list = list.filter(g => g.tipo === 'video');
    if (pickerQ.trim()) {
      const q = pickerQ.toLowerCase();
      list = list.filter(g => (g.alt || '').toLowerCase().includes(q) || (g.categoria || '').toLowerCase().includes(q));
    }
    return list;
  }, [galeria, pickerQ, pickerSoloVideos]);

  const openAdd = () => { setFormData(BLANK); setEditId(null); setMode('add'); };

  const openEdit = (s: Story) => {
    setFormData({ titulo: s.titulo, emoji: s.emoji || '✨', visible: s.visible ?? true, items: s.items || [] });
    setEditId(s.id);
    setMode('edit');
  };

  const toggleItem = (galleryItemId: string) => setFormData(p => {
    const exists = p.items.some(i => i.galleryItemId === galleryItemId);
    return {
      ...p,
      items: exists
        ? p.items.filter(i => i.galleryItemId !== galleryItemId)
        : [...p.items, { galleryItemId }],
    };
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setFormData(p => {
      const oldIndex = p.items.findIndex(i => i.galleryItemId === active.id);
      const newIndex = p.items.findIndex(i => i.galleryItemId === over.id);
      if (oldIndex === -1 || newIndex === -1) return p;
      return { ...p, items: arrayMove(p.items, oldIndex, newIndex) };
    });
  };

  const handleSave = async () => {
    if (!formData.titulo.trim()) { toast.error('Ponle un título a la historia'); return; }
    if (formData.items.length === 0) { toast.error('Selecciona al menos una foto o video de la galería'); return; }
    const payload = {
      titulo: formData.titulo.trim(),
      emoji: formData.emoji.trim() || '✨',
      visible: formData.visible,
      items: formData.items,
    };
    if (mode === 'edit' && editId) {
      await updateDoc(doc(db, COL.HISTORIAS_INSTAGRAM, editId), payload);
      toast.success('✅ Historia actualizada');
    } else {
      await addDoc(collection(db, COL.HISTORIAS_INSTAGRAM), {
        ...payload, order: stories.length + 1, createdAt: new Date().toISOString(),
      });
      toast.success('✅ Historia creada');
    }
    setMode('idle'); setFormData(BLANK); setEditId(null);
    getToken().then(idToken => revalidarWeb(idToken, [])).catch(() => {});
  };

  const toggleVisible = (s: Story) => open({
    type: s.visible ? 'hide' : 'show',
    title: s.visible ? 'Ocultar historia' : 'Mostrar historia',
    description: s.visible
      ? 'La historia dejará de verse en la sección de la web pública.'
      : 'La historia volverá a aparecer en la web pública.',
    collection: COL.HISTORIAS_INSTAGRAM,
    docId: s.id,
    field: 'visible',
  });

  const handleDelete = (s: Story) => open({
    type: 'delete',
    title: 'Eliminar historia',
    description: 'Se elimina la historia destacada. Las fotos y videos originales siguen intactos en la Galería.',
    onConfirm: async () => {
      await deleteDoc(doc(db, COL.HISTORIAS_INSTAGRAM, s.id));
      toast.success('Historia eliminada');
      getToken().then(idToken => revalidarWeb(idToken, [])).catch(() => {});
    },
  });

  if (loading) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', fontWeight: 700, color: '#0a1628', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Instagram size={22} /> Historias Instagram
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 4 }}>
            {stories.filter(s => s.visible).length} visibles · {stories.length} en total
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
          <Plus size={16} /> Nueva historia
        </button>
      </div>

      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12,
        padding: '0.875rem 1.25rem', display: 'flex', gap: 10, alignItems: 'flex-start'
      }}>
        <span style={{ fontSize: '1.1rem' }}>💡</span>
        <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
          Cada historia agrupa fotos y/o videos <strong>que ya existen en tu Galería</strong> (no se sube nada nuevo aquí).
          En la web pública, esta sección aparece arriba de todo, solo en celular, y al abrir una historia
          sus fotos/videos se reproducen en secuencia, igual que en Instagram. Arrastra las miniaturas para
          ordenar en qué secuencia se ven.
        </p>
      </div>

      {/* Formulario add/edit */}
      {(mode === 'add' || mode === 'edit') && (
        <div className="admin-card" style={{ padding: '1.5rem', animation: 'slideUp .3s ease', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0a1628', margin: 0 }}>
              {mode === 'edit' ? '✏️ Editar historia' : 'Nueva historia destacada'}
            </h3>
            <button onClick={() => { setMode('idle'); setFormData(BLANK); setEditId(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ width: 90 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                Emoji
              </label>
              <input type="text" value={formData.emoji} maxLength={4}
                onChange={e => setFormData(p => ({ ...p, emoji: e.target.value }))}
                className="admin-input" style={{ textAlign: 'center', fontSize: '1.1rem' }} />
            </div>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                Título *
              </label>
              <input type="text" value={formData.titulo}
                onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Ej: Mejores momentos, Quinceañeros, Bodas 2026…"
                className="admin-input" />
            </div>
          </div>

          {/* Seleccionados + reordenamiento drag-and-drop */}
          {formData.items.length > 0 && (
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 8 }}>
                Orden de reproducción ({formData.items.length} seleccionados) — arrastra para reordenar
              </label>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={formData.items.map(i => i.galleryItemId)} strategy={verticalListSortingStrategy}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto', padding: 4 }}>
                    {formData.items.map((it, idx) => {
                      const g = galeriaPorId.get(it.galleryItemId);
                      if (!g) return null;
                      return (
                        <SortableRow key={it.galleryItemId} id={it.galleryItemId} index={idx}
                          item={g} onRemove={() => toggleItem(it.galleryItemId)} />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Picker: seleccionar de la galería existente */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b' }}>
                Elegir de la Galería
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" onClick={() => setPickerSoloVideos(v => !v)}
                  style={{
                    fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.7rem', borderRadius: 999, cursor: 'pointer',
                    background: pickerSoloVideos ? '#0a1628' : '#fff', color: pickerSoloVideos ? '#fff' : '#0a1628',
                    border: '1.5px solid #0a1628',
                  }}>
                  🎬 Solo videos
                </button>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="text" value={pickerQ} onChange={e => setPickerQ(e.target.value)}
                    placeholder="Buscar…" className="admin-input" style={{ paddingLeft: 26, fontSize: '0.8rem', height: 32 }} />
                </div>
              </div>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 8,
              maxHeight: 340, overflowY: 'auto', padding: 8, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0',
            }}>
              {galeriaFiltrada.length === 0 && (
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '1rem' }}>
                  No hay fotos/videos que coincidan.
                </p>
              )}
              {galeriaFiltrada.map(g => {
                const sel = formData.items.some(i => i.galleryItemId === g.id);
                return (
                  <button key={g.id} type="button" onClick={() => toggleItem(g.id)}
                    style={{
                      position: 'relative', aspectRatio: '1/1', borderRadius: 10, overflow: 'hidden',
                      border: sel ? '2.5px solid #1e3a5f' : '1px solid #e2e8f0', cursor: 'pointer', padding: 0, background: '#e2e8f0',
                    }}>
                    {g.tipo === 'video'
                      ? <video src={cxVideo(g.url)} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <img src={cxThumb(g.url)} alt={g.alt || ''} style={{
                          width: '100%', height: '100%', objectFit: 'cover',
                          objectPosition: `${(g.focalX ?? 0.5) * 100}% ${(g.focalY ?? 0.5) * 100}%`,
                        }} />}
                    {sel && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(30,58,95,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={15} color="#fff" />
                        </div>
                      </div>
                    )}
                    {g.tipo === 'video' && (
                      <span style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(10,22,40,.8)', color: '#fff', fontSize: '0.6rem', padding: '1px 5px', borderRadius: 999 }}>🎬</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              {mode === 'edit' ? 'Guardar cambios' : 'Crear historia'}
            </button>
            <button onClick={() => { setMode('idle'); setFormData(BLANK); setEditId(null); }}
              style={{ padding: '0.6rem 1.2rem', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de historias */}
      {stories.length === 0 && mode === 'idle' ? (
        <div className="admin-card" style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
          <Instagram size={32} style={{ margin: '0 auto 10px', opacity: .5 }} />
          <p style={{ fontSize: '0.9rem', margin: 0 }}>Aún no creaste ninguna historia destacada.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
          {stories.map(s => {
            const portada = s.items[0] ? galeriaPorId.get(s.items[0].galleryItemId) : null;
            return (
              <div key={s.id} className="admin-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', padding: 2, flexShrink: 0,
                    background: 'conic-gradient(#b8860b,#f5c842,#b8860b)',
                  }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '2px solid #fff' }}>
                      {portada ? (
                        portada.tipo === 'video'
                          ? <video src={cxVideo(portada.url)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <img src={cxThumb(portada.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : <div style={{ width: '100%', height: '100%', background: '#e2e8f0' }} />}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#0a1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.emoji} {s.titulo}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>{s.items.length} elemento(s)</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(s)} title="Editar" style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '0.4rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.75rem', color: '#0a1628',
                  }}>
                    <Pencil size={12} /> Editar
                  </button>
                  <button onClick={() => toggleVisible(s)} title={s.visible ? 'Ocultar' : 'Mostrar'} style={{
                    width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: s.visible ? '#0a1628' : '#f59e0b',
                  }}>
                    {s.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => handleDelete(s)} title="Eliminar" style={{
                    width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8, border: '1px solid rgba(239,68,68,.3)', background: '#fff', cursor: 'pointer', color: '#ef4444',
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {!s.visible && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b', textAlign: 'center' }}>OCULTA</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SortableRow({ id, index, item, onRemove }: {
  id: string; index: number; item: GalleryItem; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.6rem',
        border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff',
      }}>
        <button type="button" {...attributes} {...listeners}
          style={{ cursor: 'grab', background: 'none', border: 'none', color: '#94a3b8', display: 'flex', touchAction: 'none' }}>
          <GripVertical size={16} />
        </button>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', width: 18, textAlign: 'center' }}>{index + 1}</span>
        <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#e2e8f0' }}>
          {item.tipo === 'video'
            ? <video src={cxVideo(item.url)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <img src={cxThumb(item.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <span style={{ flex: 1, fontSize: '0.8rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.alt || item.categoria || 'Sin descripción'}
        </span>
        <button type="button" onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}>
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
