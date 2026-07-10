'use client';
// RUTA: apps/admin/src/app/dashboard/galeria/page.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs, addDoc, writeBatch } from 'firebase/firestore';
import { cxThumb, cxVideo } from '@/lib/cloudinary';
import { db, COL } from '@/lib/firebase';
import { toast } from 'sonner';
import { useModal } from '@/components/ui/Modal';
import ImageUploader from '@/components/ui/ImageUploader';
import { Plus, Eye, EyeOff, Trash2, Filter, Search, X, Pencil, Sparkles, CheckSquare, Square, Layers } from 'lucide-react';
import Link from 'next/link';
import { SUBCATS } from '@/lib/galeriaTaxonomy';

const BLANK = { categoria: 'General', subcategoria: '', tipo: 'imagen', visible: true, alt: '', albumId: '' };

const TIPOS_EVENTO_ALBUM = ['Quinceañero', 'Cumpleaños', 'Boda', 'Baby Shower', 'Corporativo', 'Bautizo', 'Graduación', 'Otro'];

const ALBUM_BLANK = {
  titulo: '', tipoEvento: '', cliente: '', fecha: new Date().toISOString().slice(0, 10),
  descripcion: '', coverUrl: '', coverFocalX: 0.5, coverFocalY: 0.5, visible: true,
};

// "Quinceañero de Sofía" -> "quinceanero-de-sofia" — para el slug del álbum
function slugify(title: string): string {
  return title
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Score a string match: 2=exact word, 1=partial, 0=none
function score(text: string, q: string): number {
  if (!text) return 0;
  const t = text.toLowerCase();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  let total = 0;
  for (const w of words) {
    if (t.includes(w)) total += t.split(w).length - 1;
  }
  return total;
}

function smartSearch(items: any[], q: string) {
  if (!q.trim()) return { results: items, suggestions: [] };
  const scored = items
    .map(item => ({
      item,
      s: score(item.alt, q) * 3 + score(item.categoria, q) * 2 + score(item.subcategoria, q) * 2,
    }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map(x => x.item);

  if (scored.length > 0) return { results: scored, suggestions: [] };

  // No results → suggest categories/subcategories that partially relate
  const allTerms = new Set<string>();
  for (const item of items) {
    if (item.categoria) allTerms.add(item.categoria);
    if (item.subcategoria) allTerms.add(item.subcategoria);
    if (item.alt) item.alt.split(/\s+/).forEach((w: string) => w.length > 3 && allTerms.add(w));
  }
  const suggestions = [...allTerms]
    .filter(t => {
      const tl = t.toLowerCase();
      const ql = q.toLowerCase();
      return tl.includes(ql[0]) || ql.split(' ').some((w: string) => tl.includes(w[0]));
    })
    .slice(0, 6);

  return { results: [], suggestions };
}

export default function GaleriaPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'idle' | 'add' | 'edit'>('idle');
  const [editId, setEditId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState('Todas');
  const [searchQ, setSearchQ] = useState('');
  const [formData, setFormData] = useState<any>(BLANK);
  const [cats, setCats] = useState<string[]>(Object.keys(SUBCATS));
  const { open } = useModal();
  const searchRef = useRef<HTMLInputElement>(null);

  // Álbumes reales (colección `albums`) — para el select del formulario,
  // el badge en cada miniatura y la agrupación en lote desde el grid.
  const [albumesDisponibles, setAlbumesDisponibles] = useState<any[]>([]);
  const [albumItemCounts, setAlbumItemCounts] = useState<Record<string, number>>({});
  const [creandoAlbum, setCreandoAlbum] = useState(false);
  const [nuevoAlbumTitulo, setNuevoAlbumTitulo] = useState('');

  // Selección múltiple en el grid, para agrupar/publicar/ocultar en lote.
  const [selMode, setSelMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAlbumId, setBulkAlbumId] = useState('');
  const [bulkCreandoAlbum, setBulkCreandoAlbum] = useState(false);
  const [bulkNuevoTitulo, setBulkNuevoTitulo] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  // Pestaña de la página: fotos sueltas o gestión de álbumes (antes era una
  // ruta aparte /dashboard/albumes; ahora vive aquí para no fragmentar el flujo).
  const [view, setView] = useState<'fotos' | 'albumes'>('fotos');
  const [albumMode, setAlbumMode] = useState<'idle' | 'add' | 'edit'>('idle');
  const [albumEditId, setAlbumEditId] = useState<string | null>(null);
  const [albumFormData, setAlbumFormData] = useState<any>(ALBUM_BLANK);

  useEffect(() => onSnapshot(
    query(collection(db, COL.GALERIA), orderBy('order', 'asc')),
    snap => { setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
  ), []);

  useEffect(() => onSnapshot(query(collection(db, COL.ALBUMES), orderBy('order', 'asc')), snap => {
    setAlbumesDisponibles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }), []);

  useEffect(() => {
    const counts: Record<string, number> = {};
    items.forEach(i => { if (i.albumId) counts[i.albumId] = (counts[i.albumId] || 0) + 1; });
    setAlbumItemCounts(counts);
  }, [items]);

  useEffect(() => {
    getDocs(query(collection(db, COL.SERVICIOS), orderBy('order', 'asc'))).then(snap => {
      const titles = snap.docs.map(d => (d.data() as any).title).filter(Boolean);
      setCats(['General', ...titles]);
    });
  }, []);

  /** Crea un álbum nuevo con la foto que se está editando/agregando como portada, y lo selecciona. */
  const handleCrearAlbumInline = async () => {
    const titulo = nuevoAlbumTitulo.trim();
    if (!titulo) { toast.error('Ponle un título al álbum'); return; }
    const ref = await addDoc(collection(db, COL.ALBUMES), {
      titulo, slug: slugify(titulo), tipoEvento: '', cliente: '', fecha: new Date().toISOString().slice(0, 10),
      descripcion: '', coverUrl: formData.url || '', coverFocalX: formData.focalX ?? 0.5, coverFocalY: formData.focalY ?? 0.5,
      visible: true, order: albumesDisponibles.length + 1, createdAt: new Date().toISOString(),
    });
    setFormData((p: any) => ({ ...p, albumId: ref.id }));
    setCreandoAlbum(false);
    setNuevoAlbumTitulo('');
    toast.success(`✅ Álbum "${titulo}" creado`);
  };

  const subcatsDisponibles = SUBCATS[formData.categoria] || [];

  const openAdd = () => {
    setFormData(BLANK);
    setEditId(null);
    setMode('add');
  };

  const openEdit = (item: any) => {
    setFormData({
      url: item.url || '',
      alt: item.alt || '',
      categoria: item.categoria || 'General',
      subcategoria: item.subcategoria || '',
      tipo: item.tipo || 'imagen',
      visible: item.visible ?? true,
      focalX: item.focalX ?? 0.5,
      focalY: item.focalY ?? 0.5,
      mediaType: item.tipo || 'imagen',
      albumId: item.albumId || '',
    });
    setEditId(item.id);
    setMode('edit');
  };

  const handleSave = async () => {
    if (!formData.url) { toast.error('Sube una imagen o video primero'); return; }
    const payload = {
      url: formData.url,
      alt: formData.alt || formData.subcategoria || formData.categoria || 'Evento J&M',
      categoria: formData.categoria || 'General',
      subcategoria: formData.subcategoria || '',
      focalX: formData.focalX ?? 0.5,
      focalY: formData.focalY ?? 0.5,
      tipo: formData.mediaType || formData.tipo || 'imagen',
      visible: formData.visible ?? true,
      // Referencia al documento real en la colección `albums` (o '' si va suelta).
      albumId: formData.albumId || '',
    };
    if (mode === 'edit' && editId) {
      await updateDoc(doc(db, COL.GALERIA, editId), payload);
      toast.success('✅ Imagen actualizada');
    } else {
      const id = `${Date.now()}`;
      await setDoc(doc(db, COL.GALERIA, id), { ...payload, order: items.length + 1, row: 1, createdAt: new Date().toISOString() });
      toast.success('✅ Imagen agregada a la galería');
    }
    setMode('idle');
    setFormData(BLANK);
    setEditId(null);
  };

  const toggleVisible = (item: any) => open({
    type: item.visible ? 'hide' : 'show',
    title: item.visible ? 'Ocultar imagen' : 'Mostrar imagen',
    description: item.visible
      ? 'La imagen dejará de verse en la galería de la web pública.'
      : 'La imagen volverá a aparecer en la galería.',
    collection: COL.GALERIA,
    docId: item.id,
    field: 'visible',
  });

  const handleDelete = (item: any) => open({
    type: 'delete',
    title: 'Eliminar imagen',
    description: 'Se elimina el documento de Firestore. La imagen en Cloudinary permanece.',
    onConfirm: async () => {
      await deleteDoc(doc(db, COL.GALERIA, item.id));
      toast.success('Imagen eliminada');
    },
  });

  const toggleSelected = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  /** Crea un álbum nuevo usando la primera foto seleccionada como portada. */
  const handleCrearAlbumEnLote = async () => {
    const titulo = bulkNuevoTitulo.trim();
    if (!titulo) { toast.error('Ponle un título al álbum'); return; }
    const primera = items.find(i => selected.has(i.id));
    const ref = await addDoc(collection(db, COL.ALBUMES), {
      titulo, slug: slugify(titulo), tipoEvento: '', cliente: '', fecha: new Date().toISOString().slice(0, 10),
      descripcion: '', coverUrl: primera?.url || '', coverFocalX: primera?.focalX ?? 0.5, coverFocalY: primera?.focalY ?? 0.5,
      visible: true, order: albumesDisponibles.length + 1, createdAt: new Date().toISOString(),
    });
    setBulkAlbumId(ref.id);
    setBulkCreandoAlbum(false);
    setBulkNuevoTitulo('');
    toast.success(`✅ Álbum "${titulo}" creado`);
  };

  /** Asigna el álbum elegido (bulkAlbumId) a todos los items seleccionados. */
  const handleAsignarAlbumEnLote = async () => {
    if (!bulkAlbumId) { toast.error('Elige o crea un álbum primero'); return; }
    setBulkBusy(true);
    try {
      const batch = writeBatch(db);
      selected.forEach(id => batch.update(doc(db, COL.GALERIA, id), { albumId: bulkAlbumId }));
      await batch.commit();
      toast.success(`✅ ${selected.size} item(s) agregados al álbum`);
      setSelected(new Set()); setSelMode(false); setBulkAlbumId('');
    } catch (e: any) {
      toast.error(e.message || 'Error agrupando en álbum');
    } finally {
      setBulkBusy(false);
    }
  };

  // ── Panel de Álbumes (fusionado dentro de Galería) ────────────────────
  const openAlbumAdd = () => { setAlbumFormData(ALBUM_BLANK); setAlbumEditId(null); setAlbumMode('add'); };

  const openAlbumEdit = (album: any) => {
    setAlbumFormData({
      titulo: album.titulo || '', tipoEvento: album.tipoEvento || '', cliente: album.cliente || '',
      fecha: album.fecha || ALBUM_BLANK.fecha, descripcion: album.descripcion || '',
      coverUrl: album.coverUrl || '', coverFocalX: album.coverFocalX ?? 0.5, coverFocalY: album.coverFocalY ?? 0.5,
      visible: album.visible ?? true,
    });
    setAlbumEditId(album.id);
    setAlbumMode('edit');
  };

  const handleAlbumSave = async () => {
    if (!albumFormData.titulo.trim()) { toast.error('Ponle un título al álbum'); return; }
    if (!albumFormData.coverUrl) { toast.error('Elige una foto de portada'); return; }
    const payload = {
      titulo: albumFormData.titulo.trim(),
      slug: slugify(albumFormData.titulo.trim()),
      tipoEvento: albumFormData.tipoEvento || '',
      cliente: albumFormData.cliente || '',
      fecha: albumFormData.fecha || '',
      descripcion: albumFormData.descripcion || '',
      coverUrl: albumFormData.coverUrl,
      coverFocalX: albumFormData.coverFocalX ?? 0.5,
      coverFocalY: albumFormData.coverFocalY ?? 0.5,
      visible: albumFormData.visible ?? true,
    };
    if (albumMode === 'edit' && albumEditId) {
      await updateDoc(doc(db, COL.ALBUMES, albumEditId), payload);
      toast.success('✅ Álbum actualizado');
    } else {
      await addDoc(collection(db, COL.ALBUMES), { ...payload, order: albumesDisponibles.length + 1, createdAt: new Date().toISOString() });
      toast.success('✅ Álbum creado');
    }
    setAlbumMode('idle'); setAlbumFormData(ALBUM_BLANK); setAlbumEditId(null);
  };

  const toggleAlbumVisible = (album: any) => open({
    type: album.visible ? 'hide' : 'show',
    title: album.visible ? 'Ocultar álbum' : 'Publicar álbum',
    description: album.visible
      ? 'El álbum dejará de verse en /albumes y como tarjeta agrupada en la galería. Sus fotos individuales no se ven afectadas.'
      : 'El álbum volverá a aparecer en la web pública.',
    collection: COL.ALBUMES,
    docId: album.id,
    field: 'visible',
  });

  const handleAlbumDelete = (album: any) => open({
    type: 'delete',
    title: 'Eliminar álbum',
    description: 'Se borra el álbum. Las fotos siguen en la galería, solo quedan sin agrupar (puedes reagruparlas después).',
    onConfirm: async () => {
      await deleteDoc(doc(db, COL.ALBUMES, album.id));
      toast.success('Álbum eliminado');
    },
  });

  /** Saca una foto del álbum sin salir del panel de álbumes. */
  const handleQuitarDeAlbum = async (item: any) => {
    await updateDoc(doc(db, COL.GALERIA, item.id), { albumId: '' });
    toast.success('Foto removida del álbum');
  };

  const fotosDelAlbumEnEdicion = albumEditId ? items.filter(i => i.albumId === albumEditId) : [];

  const handlePublicarEnLote = async (visible: boolean) => {
    setBulkBusy(true);
    try {
      const batch = writeBatch(db);
      selected.forEach(id => batch.update(doc(db, COL.GALERIA, id), { visible }));
      await batch.commit();
      toast.success(`✅ ${selected.size} item(s) ${visible ? 'publicados' : 'ocultos'}`);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e.message || 'Error actualizando visibilidad');
    } finally {
      setBulkBusy(false);
    }
  };

  // Category filter first, then smart search
  const catFiltered = filterCat === 'Todas' ? items : items.filter(i => i.categoria === filterCat);
  const { results: filtrados, suggestions } = useMemo(
    () => smartSearch(catFiltered, searchQ),
    [catFiltered, searchQ]
  );

  const activeCount = items.filter(i => i.visible).length;
  const hiddenCount = items.filter(i => !i.visible).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-h1" style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', fontWeight: 700, color: '#0a1628', margin: 0 }}>Galería</h1>
          <p className="page-h1-sub" style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 4 }}>
            {view === 'fotos'
              ? <>{activeCount} visibles · {hiddenCount} ocultas{filterCat !== 'Todas' && ` · filtrando: "${filterCat}"`}</>
              : <>{albumesDisponibles.filter(a => a.visible).length} álbumes publicados de {albumesDisponibles.length}</>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          {view === 'fotos' ? (
            <>
              <Link href="/dashboard/galeria/importar" style={{
                display: 'flex', alignItems: 'center', gap: 6, background: '#d4a017', color: '#0a1628',
                border: 'none', borderRadius: 10, padding: '0.6rem 1rem', fontWeight: 700,
                fontSize: '0.82rem', textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                <Sparkles size={15} /> Importar imágenes desde Google Photos o Icloud
              </Link>
              <button
                onClick={() => { setSelMode(m => !m); setSelected(new Set()); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: selMode ? '#0a1628' : '#fff', color: selMode ? '#fff' : '#0a1628',
                  border: '1.5px solid #0a1628', borderRadius: 10, padding: '0.6rem 1rem', fontWeight: 700,
                  fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                {selMode ? <CheckSquare size={15} /> : <Square size={15} />}
                {selMode ? 'Cancelar selección' : 'Seleccionar'}
              </button>
              <button onClick={openAdd} className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                <Plus size={16} /> Agregar
              </button>
            </>
          ) : (
            <button onClick={openAlbumAdd} className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={16} /> Nuevo álbum
            </button>
          )}
        </div>
      </div>

      {/* Pestañas: Fotos / Álbumes */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0' }}>
        {([
          { id: 'fotos', label: '🖼️ Fotos y videos' },
          { id: 'albumes', label: `🗂️ Álbumes${albumesDisponibles.length ? ` (${albumesDisponibles.length})` : ''}` },
        ] as const).map(t => (
          <button key={t.id}
            onClick={() => { setView(t.id); setMode('idle'); setAlbumMode('idle'); setSelMode(false); setSelected(new Set()); }}
            style={{
              padding: '0.65rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 700, color: view === t.id ? '#0a1628' : '#94a3b8',
              borderBottom: view === t.id ? '2.5px solid #d4a017' : '2.5px solid transparent',
              marginBottom: -1, whiteSpace: 'nowrap',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Info */}
      {view === 'fotos' && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12,
          padding: '0.875rem 1.25rem', display: 'flex', gap: 10, alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '1.1rem' }}>💡</span>
          <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            <strong>Categoría + Subcategoría:</strong> Al asignar ambos campos, la galería pública mostrará
            filtros dobles. Por ejemplo: <em>Shows Infantiles → Mickey Mouse</em>, o <em>Decoración → Princesas</em>.
            Los visitantes podrán filtrar por categoría y luego refinar por subcategoría.
          </p>
        </div>
      )}
      {view === 'albumes' && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12,
          padding: '0.875rem 1.25rem', display: 'flex', gap: 10, alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '1.1rem' }}>💡</span>
          <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Un álbum agrupa varias fotos/videos de un mismo evento con su propia página en la web
            (<code>jmdecoracionesyeventos.vercel.app/albumes/tu-slug</code>) y aparece como <strong>una sola
              tarjeta</strong> en la galería pública en vez de fotos sueltas. Créalo aquí, luego ve a la pestaña{' '}
            <strong>Fotos y videos</strong> y asigna cada foto al álbum desde su formulario (o selección múltiple).
          </p>
        </div>
      )}

      {/* Formulario add / edit — pestaña Fotos */}
      {view === 'fotos' && mode !== 'idle' && (
        <div className="admin-card" style={{ padding: '1.5rem', animation: 'slideUp .3s ease' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0a1628', margin: '0 0 16px' }}>
            {mode === 'edit' ? '✏️ Editar imagen / video' : 'Nueva imagen o video'}
          </h3>
          <div className="galeria-form-grid" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
            {/* Uploader */}
            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
              <ImageUploader
                key={editId ?? 'new'}
                label="Imagen o Video (máx 200MB)"
                folder="galeria"
                acceptVideo={true}
                value={formData.url}
                focal={{ x: formData.focalX ?? 0.5, y: formData.focalY ?? 0.5 }}
                previewAspect={4 / 3} previewLabel="Galería (paisaje 4:3)"
                onComplete={(url, fp, type) => setFormData((p: any) => ({ ...p, url, focalX: fp.x, focalY: fp.y, mediaType: type }))}
              />
            </div>

            {/* Campos */}
            <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Categoría */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Categoría *
                </label>
                <select
                  value={formData.categoria}
                  onChange={e => setFormData((p: any) => ({ ...p, categoria: e.target.value, subcategoria: '', _subcatDrop: '' }))}
                  className="admin-input">
                  {cats.map(c => <option key={c}>{c}</option>)}
                </select>
                <p style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 4 }}>
                  Define el filtro principal en la galería pública.
                </p>
              </div>

              {/* Subcategoría predefinida — con campo "Otro" */}
              {subcatsDisponibles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block' }}>
                    Subcategoría (temática)
                  </label>
                  <select
                    value={formData._subcatDrop ?? (subcatsDisponibles.includes(formData.subcategoria) ? formData.subcategoria : formData.subcategoria ? 'Otro' : '')}
                    onChange={e => {
                      const v = e.target.value;
                      setFormData((p: any) => ({ ...p, _subcatDrop: v, subcategoria: v === 'Otro' ? '' : v }));
                    }}
                    className="admin-input">
                    <option value="">Sin subcategoría</option>
                    {subcatsDisponibles.map(s => <option key={s}>{s}</option>)}
                  </select>
                  {/* Campo libre cuando se elige "Otro" */}
                  {(formData._subcatDrop === 'Otro' || (!subcatsDisponibles.includes(formData.subcategoria) && formData.subcategoria)) && (
                    <input
                      type="text"
                      autoFocus
                      value={formData.subcategoria || ''}
                      onChange={e => setFormData((p: any) => ({ ...p, subcategoria: e.target.value }))}
                      placeholder="Ej: Quinceañero, Aniversario, etc."
                      className="admin-input"
                      style={{ borderColor: '#d4a017', outline: 'none' }}
                    />
                  )}
                </div>
              )}

              {/* Subcategoría manual cuando la categoría no tiene opciones */}
              {subcatsDisponibles.length === 0 && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                    Subcategoría (personalizada)
                  </label>
                  <input type="text" value={formData.subcategoria || ''}
                    onChange={e => setFormData((p: any) => ({ ...p, subcategoria: e.target.value }))}
                    placeholder="Ej: Quinceañero, Bautizo, etc." className="admin-input" />
                </div>
              )}

              {/* Alt text */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Descripción (texto alternativo)
                </label>
                <input type="text" value={formData.alt || ''}
                  onChange={e => setFormData((p: any) => ({ ...p, alt: e.target.value }))}
                  placeholder="Ej: Fiesta de Mickey Mouse en Sechura" className="admin-input" />
              </div>

              {/* Álbum — el mismo concepto que en /dashboard/albumes. Selecciona
                  uno existente o crea uno nuevo sin salir de este formulario. */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Álbum (opcional)
                </label>

                {!creandoAlbum ? (
                  <>
                    <select
                      value={formData.albumId || ''}
                      onChange={e => {
                        if (e.target.value === '__nuevo__') { setCreandoAlbum(true); setNuevoAlbumTitulo(''); return; }
                        setFormData((p: any) => ({ ...p, albumId: e.target.value }));
                      }}
                      className="admin-input">
                      <option value="">— Sin álbum (foto suelta) —</option>
                      {albumesDisponibles.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.titulo} · {albumItemCounts[a.id] || 0} item{albumItemCounts[a.id] === 1 ? '' : 's'}
                        </option>
                      ))}
                      <option value="__nuevo__">+ Crear álbum nuevo…</option>
                    </select>
                    <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '6px 0 0' }}>
                      Agrupa varias fotos/videos del mismo evento con su propia página en /albumes.
                    </p>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.75rem' }}>
                    <input type="text" autoFocus value={nuevoAlbumTitulo}
                      onChange={e => setNuevoAlbumTitulo(e.target.value)}
                      placeholder="Título del nuevo álbum, ej: Quinceañero de Sofía"
                      className="admin-input" />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={handleCrearAlbumInline}
                        style={{ flex: 1, background: '#d4a017', color: '#0a1628', border: 'none', borderRadius: 8, padding: '0.5rem', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                        Crear y usar
                      </button>
                      <button type="button" onClick={() => setCreandoAlbum(false)}
                        style={{ flex: 1, background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 8, padding: '0.5rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                    <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: 0 }}>
                      Esta foto será la portada del álbum. Podrás editar fecha, tipo de evento, etc. en Álbumes.
                    </p>
                  </div>
                )}
              </div>

              {/* Preview filtro */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '0.875rem', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 6px' }}>Vista previa del filtro:</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 700, padding: '2px 10px', borderRadius: 999,
                    background: 'linear-gradient(135deg,#0a1628,#1e3a5f)', color: '#fff'
                  }}>
                    {formData.categoria || 'General'}
                  </span>
                  {formData.subcategoria && (
                    <>
                      <span style={{ color: '#94a3b8' }}>›</span>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999,
                        background: 'rgba(212,160,23,0.1)', border: '1.5px solid #d4a017', color: '#b8860b'
                      }}>
                        {formData.subcategoria}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={() => { setMode('idle'); setFormData(BLANK); setEditId(null); }} className="btn-outline">Cancelar</button>
            <button onClick={handleSave} className="btn-gold">
              {mode === 'edit' ? '💾 Guardar cambios' : '✅ Guardar en galería'}
            </button>
          </div>
        </div>
      )}

      {/* Barra de búsqueda + filtros — pestaña Fotos */}
      {view === 'fotos' && !loading && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Search input */}
          <div style={{ position: 'relative', maxWidth: 480, width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              ref={searchRef}
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Buscar por descripción, categoría, temática…"
              style={{
                width: '100%', padding: '0.55rem 2.2rem 0.55rem 2.4rem',
                borderRadius: 999, border: '1.5px solid #e2e8f0', outline: 'none',
                fontFamily: 'var(--font-jakarta)', fontSize: '0.82rem', color: '#0a1628',
                background: '#fff', boxSizing: 'border-box', transition: 'border-color .2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#d4a017')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
            {searchQ && (
              <button onClick={() => setSearchQ('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2
                }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category filter chips — horizontal scroll en móvil */}
          <div className="chip-scroll" style={{ alignItems: 'center' }}>
            <Filter size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
            {['Todas', ...cats.filter(c => items.some(i => i.categoria === c))].map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className={`chip${filterCat === cat ? ' active' : ''}`}>
                {cat}
                {cat !== 'Todas' && (
                  <span style={{ marginLeft: 4, fontSize: '0.65rem', opacity: .7 }}>
                    {items.filter(i => i.categoria === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid de imágenes — pestaña Fotos */}
      {view === 'fotos' && (loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
          {[...Array(12)].map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '4/3', borderRadius: 12 }} />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</p>
          {searchQ ? (
            <>
              <p style={{ color: '#64748b', marginBottom: suggestions.length ? 12 : 0 }}>
                No se encontraron resultados para <strong>"{searchQ}"</strong>
              </p>
              {suggestions.length > 0 && (
                <div>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 8 }}>¿Quisiste decir…?</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {suggestions.map(s => (
                      <button key={s} onClick={() => setSearchQ(s)}
                        style={{
                          padding: '0.3rem 0.875rem', borderRadius: 999, border: '1.5px solid #d4a017',
                          background: 'rgba(212,160,23,0.08)', color: '#b8860b',
                          fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#64748b' }}>
              {filterCat === 'Todas'
                ? 'La galería está vacía. Agrega tu primera imagen o video.'
                : `No hay imágenes en "${filterCat}" aún.`}
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
          {filtrados.map(item => {
            const isSel = selected.has(item.id);
            const album = item.albumId ? albumesDisponibles.find(a => a.id === item.albumId) : null;
            return (
              <div key={item.id}
                style={{
                  position: 'relative', borderRadius: 14, overflow: 'hidden', aspectRatio: '4/3',
                  border: isSel ? '2.5px solid #1e3a5f' : item.visible ? 'none' : '2px solid #fde68a',
                  opacity: item.visible ? 1 : .65,
                  background: '#e2e8f0',
                  boxShadow: isSel ? '0 0 0 3px rgba(30,58,95,0.2)' : '0 2px 8px rgba(10,22,40,0.08)',
                  transition: 'transform .2s, box-shadow .2s',
                  cursor: selMode ? 'pointer' : undefined,
                }}
                onClick={() => { if (selMode) toggleSelected(item.id); }}
                onMouseEnter={e => { if (selMode) return; const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 20px rgba(10,22,40,0.15)'; const ov = el.querySelector('.adm-ov') as HTMLElement | null; if (ov) ov.style.opacity = '1'; }}
                onMouseLeave={e => { if (selMode) return; const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 2px 8px rgba(10,22,40,0.08)'; const ov = el.querySelector('.adm-ov') as HTMLElement | null; if (ov) ov.style.opacity = '0'; }}>

                {item.url && (
                  item.tipo === 'video' || item.url?.match(/\.(mp4|webm|mov)(\?|$)/i)
                    ? <video src={cxVideo(item.url)} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <img src={cxThumb(item.url)} alt={item.alt || 'Evento'} loading="lazy" decoding="async"
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        objectPosition: `${(item.focalX ?? 0.5) * 100}% ${(item.focalY ?? 0.5) * 100}%`
                      }} />
                )}

                {/* Checkbox de selección */}
                {selMode && (
                  <div style={{
                    position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: 7,
                    background: isSel ? '#1e3a5f' : 'rgba(255,255,255,0.92)', border: isSel ? 'none' : '1.5px solid #cbd5e1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3,
                  }}>
                    {isSel && <CheckSquare size={14} color="#fff" />}
                  </div>
                )}

                {/* Overlay con acciones */}
                {!selMode && (
                  <div className="adm-ov"
                    style={{
                      position: 'absolute', inset: 0, background: 'rgba(10,22,40,0.7)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 8, opacity: 0, transition: 'opacity .25s'
                    }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* Editar */}
                      <button onClick={() => openEdit(item)}
                        title="Editar"
                        style={{
                          width: 34, height: 34, borderRadius: 8, cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(212,160,23,.5)',
                          background: 'rgba(212,160,23,.2)', color: '#fde68a', transition: 'background .2s'
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,.4)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,.2)'}>
                        <Pencil size={13} />
                      </button>
                      {/* Visibilidad */}
                      <button onClick={() => toggleVisible(item)}
                        title={item.visible ? 'Ocultar' : 'Mostrar'}
                        style={{
                          width: 34, height: 34, borderRadius: 8, cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,.3)',
                          background: 'rgba(255,255,255,.1)', color: '#fff', transition: 'background .2s'
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.25)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.1)'}>
                        {item.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      {/* Eliminar */}
                      <button onClick={() => handleDelete(item)}
                        title="Eliminar"
                        style={{
                          width: 34, height: 34, borderRadius: 8, cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,.4)',
                          background: 'rgba(239,68,68,.2)', color: '#fca5a5', transition: 'background .2s'
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,.4)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,.2)'}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Badge categoría */}
                <div style={{ position: 'absolute', bottom: 6, left: 6, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                  <span style={{
                    display: 'block', background: 'rgba(10,22,40,.8)', color: '#fff',
                    fontSize: '0.58rem', padding: '1px 7px', borderRadius: 999
                  }}>
                    {item.categoria || 'General'}
                  </span>
                  {item.subcategoria && (
                    <span style={{
                      display: 'block', background: 'rgba(212,160,23,.8)', color: '#0a1628',
                      fontSize: '0.55rem', padding: '1px 6px', borderRadius: 999, fontWeight: 700
                    }}>
                      {item.subcategoria}
                    </span>
                  )}
                  {album && (
                    <span style={{
                      display: 'block', background: 'rgba(124,58,237,.88)', color: '#fff',
                      fontSize: '0.55rem', padding: '1px 6px', borderRadius: 999, fontWeight: 700, maxWidth: 140,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      📁 {album.titulo}
                    </span>
                  )}
                </div>

                {/* Estado de publicación — siempre visible, no solo al pasar el mouse */}
                {!item.visible ? (
                  <div style={{
                    position: 'absolute', top: 6, right: 6, background: '#f59e0b', color: '#0a1628',
                    fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, pointerEvents: 'none'
                  }}>
                    OCULTO
                  </div>
                ) : (
                  <div style={{
                    position: 'absolute', top: 6, right: 6, background: 'rgba(34,197,94,.9)', color: '#fff',
                    fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, pointerEvents: 'none'
                  }}>
                    ✓ Publicado
                  </div>
                )}

                {(item.tipo === 'video' || item.url?.match(/\.(mp4|webm|mov)$/i)) && (
                  <div style={{
                    position: 'absolute', top: 6, left: selMode ? 38 : 6, background: 'rgba(10,22,40,.8)', color: '#fff',
                    fontSize: '0.65rem', padding: '2px 7px', borderRadius: 999, pointerEvents: 'none'
                  }}>
                    🎬
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Panel de Álbumes — pestaña Álbumes */}
      {view === 'albumes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Formulario add / edit álbum */}
          {albumMode !== 'idle' && (
            <div className="admin-card" style={{ padding: '1.5rem', animation: 'slideUp .3s ease' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0a1628', margin: '0 0 16px' }}>
                {albumMode === 'edit' ? '✏️ Editar álbum' : 'Nuevo álbum'}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                    Portada del álbum
                  </label>
                  <ImageUploader
                    key={albumEditId ?? 'new-album'}
                    label="Foto de portada"
                    folder="albumes"
                    acceptVideo={false}
                    value={albumFormData.coverUrl}
                    focal={{ x: albumFormData.coverFocalX ?? 0.5, y: albumFormData.coverFocalY ?? 0.5 }}
                    previewAspect={4 / 5} previewLabel="Portada (retrato 4:5)"
                    onComplete={(url, fp) => setAlbumFormData((p: any) => ({ ...p, coverUrl: url, coverFocalX: fp.x, coverFocalY: fp.y }))}
                  />
                </div>

                <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                      Título *
                    </label>
                    <input type="text" value={albumFormData.titulo}
                      onChange={e => setAlbumFormData((p: any) => ({ ...p, titulo: e.target.value }))}
                      placeholder="Ej: Quinceañero de Sofía" className="admin-input" />
                    {albumFormData.titulo && (
                      <p style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 4 }}>
                        URL: /albumes/{slugify(albumFormData.titulo)}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                        Tipo de evento
                      </label>
                      <select value={albumFormData.tipoEvento}
                        onChange={e => setAlbumFormData((p: any) => ({ ...p, tipoEvento: e.target.value }))}
                        className="admin-input">
                        <option value="">— Sin especificar —</option>
                        {TIPOS_EVENTO_ALBUM.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                        Fecha del evento
                      </label>
                      <input type="date" value={albumFormData.fecha}
                        onChange={e => setAlbumFormData((p: any) => ({ ...p, fecha: e.target.value }))}
                        className="admin-input" />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                      Cliente (opcional, no se muestra en público si lo dejas vacío)
                    </label>
                    <input type="text" value={albumFormData.cliente}
                      onChange={e => setAlbumFormData((p: any) => ({ ...p, cliente: e.target.value }))}
                      placeholder="Ej: Familia Rodríguez" className="admin-input" />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                      Descripción (opcional)
                    </label>
                    <textarea value={albumFormData.descripcion}
                      onChange={e => setAlbumFormData((p: any) => ({ ...p, descripcion: e.target.value }))}
                      placeholder="Breve historia del evento, para el detalle del álbum y el SEO"
                      className="admin-input" rows={3} />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#0a1628', cursor: 'pointer' }}>
                    <input type="checkbox" checked={albumFormData.visible}
                      onChange={e => setAlbumFormData((p: any) => ({ ...p, visible: e.target.checked }))} />
                    Publicado (visible en la web)
                  </label>
                </div>
              </div>

              {/* Fotos que ya pertenecen a este álbum — para gestionarlas sin salir de aquí */}
              {albumMode === 'edit' && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', marginBottom: 10 }}>
                    Fotos en este álbum ({fotosDelAlbumEnEdicion.length})
                  </p>
                  {fotosDelAlbumEnEdicion.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                      Aún no hay fotos asignadas. Ve a la pestaña <strong>Fotos y videos</strong>, edita una foto
                      (o selecciona varias) y asígnale este álbum.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 10 }}>
                      {fotosDelAlbumEnEdicion.map(foto => (
                        <div key={foto.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3', background: '#e2e8f0' }}>
                          {foto.tipo === 'video' || foto.url?.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                            <video src={cxVideo(foto.url)} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <img src={cxThumb(foto.url)} alt={foto.alt || 'Foto'} loading="lazy"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                          <button onClick={() => handleQuitarDeAlbum(foto)} title="Quitar del álbum"
                            style={{
                              position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 7,
                              background: 'rgba(10,22,40,.85)', color: '#fca5a5', border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => { setAlbumMode('idle'); setAlbumFormData(ALBUM_BLANK); setAlbumEditId(null); }} className="btn-outline">Cancelar</button>
                <button onClick={handleAlbumSave} className="btn-gold">
                  {albumMode === 'edit' ? '💾 Guardar cambios' : '✅ Crear álbum'}
                </button>
              </div>
            </div>
          )}

          {/* Grid de álbumes */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '4/5', borderRadius: 14 }} />)}
            </div>
          ) : albumesDisponibles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗂️</p>
              <p style={{ color: '#64748b' }}>Aún no creas ningún álbum. Empieza con el botón "Nuevo álbum".</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
              {albumesDisponibles.map(album => (
                <div key={album.id} className="admin-card" style={{
                  padding: 0, overflow: 'hidden', border: album.visible ? undefined : '2px solid #fde68a',
                  opacity: album.visible ? 1 : .7,
                }}>
                  <div style={{ position: 'relative', aspectRatio: '4/5', background: '#e2e8f0' }}>
                    {album.coverUrl && (
                      <img src={cxThumb(album.coverUrl)} alt={album.titulo} loading="lazy"
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover',
                          objectPosition: `${(album.coverFocalX ?? 0.5) * 100}% ${(album.coverFocalY ?? 0.5) * 100}%`,
                        }} />
                    )}
                    <div style={{
                      position: 'absolute', bottom: 8, left: 8, background: 'rgba(10,22,40,.85)', color: '#fff',
                      fontSize: '0.65rem', fontWeight: 700, padding: '2px 9px', borderRadius: 999,
                    }}>
                      🖼️ {albumItemCounts[album.id] || 0} {albumItemCounts[album.id] === 1 ? 'item' : 'items'}
                    </div>
                    {!album.visible && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8, background: '#f59e0b', color: '#0a1628',
                        fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      }}>
                        OCULTO
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '0.85rem 1rem' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0a1628', margin: 0 }}>{album.titulo}</p>
                    {album.tipoEvento && <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '2px 0 0' }}>{album.tipoEvento}</p>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button onClick={() => openAlbumEdit(album)} title="Editar"
                        style={{ flex: 1, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => toggleAlbumVisible(album)} title={album.visible ? 'Ocultar' : 'Publicar'}
                        style={{ flex: 1, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {album.visible ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button onClick={() => handleAlbumDelete(album)} title="Eliminar"
                        style={{ flex: 1, height: 32, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Barra flotante de acciones en lote — pestaña Fotos */}
      {view === 'fotos' && selMode && selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 40,
          background: '#0a1628', borderRadius: 16, padding: '0.9rem 1.1rem',
          boxShadow: '0 12px 32px rgba(10,22,40,0.35)', display: 'flex', alignItems: 'center',
          gap: 12, flexWrap: 'wrap', maxWidth: 'calc(100vw - 2rem)',
        }}>
          <span style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {selected.size} seleccionado{selected.size === 1 ? '' : 's'}
          </span>

          {!bulkCreandoAlbum ? (
            <select
              value={bulkAlbumId}
              onChange={e => {
                if (e.target.value === '__nuevo__') { setBulkCreandoAlbum(true); setBulkNuevoTitulo(''); return; }
                setBulkAlbumId(e.target.value);
              }}
              style={{ borderRadius: 8, border: 'none', padding: '0.5rem 0.6rem', fontSize: '0.8rem', minWidth: 180 }}>
              <option value="">Agregar a álbum…</option>
              {albumesDisponibles.map(a => <option key={a.id} value={a.id}>{a.titulo}</option>)}
              <option value="__nuevo__">+ Crear álbum nuevo…</option>
            </select>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="text" autoFocus value={bulkNuevoTitulo}
                onChange={e => setBulkNuevoTitulo(e.target.value)}
                placeholder="Título del álbum"
                style={{ borderRadius: 8, border: 'none', padding: '0.5rem 0.6rem', fontSize: '0.8rem', width: 170 }} />
              <button onClick={handleCrearAlbumEnLote}
                style={{ background: '#d4a017', color: '#0a1628', border: 'none', borderRadius: 8, padding: '0.5rem 0.7rem', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                Crear
              </button>
              <button onClick={() => setBulkCreandoAlbum(false)}
                style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.7rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          )}

          {bulkAlbumId && !bulkCreandoAlbum && (
            <button onClick={handleAsignarAlbumEnLote} disabled={bulkBusy}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.8rem', fontWeight: 700, fontSize: '0.78rem', cursor: bulkBusy ? 'not-allowed' : 'pointer' }}>
              <Layers size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Agrupar
            </button>
          )}

          <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.15)' }} />

          <button onClick={() => handlePublicarEnLote(true)} disabled={bulkBusy}
            style={{ background: 'rgba(34,197,94,.2)', color: '#86efac', border: '1px solid rgba(34,197,94,.4)', borderRadius: 8, padding: '0.5rem 0.7rem', fontSize: '0.78rem', fontWeight: 700, cursor: bulkBusy ? 'not-allowed' : 'pointer' }}>
            <Eye size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Publicar
          </button>
          <button onClick={() => handlePublicarEnLote(false)} disabled={bulkBusy}
            style={{ background: 'rgba(245,158,11,.2)', color: '#fde68a', border: '1px solid rgba(245,158,11,.4)', borderRadius: 8, padding: '0.5rem 0.7rem', fontSize: '0.78rem', fontWeight: 700, cursor: bulkBusy ? 'not-allowed' : 'pointer' }}>
            <EyeOff size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Ocultar
          </button>

          <button onClick={() => { setSelected(new Set()); setSelMode(false); }}
            style={{ background: 'transparent', color: 'rgba(255,255,255,.6)', border: 'none', fontSize: '0.78rem', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
