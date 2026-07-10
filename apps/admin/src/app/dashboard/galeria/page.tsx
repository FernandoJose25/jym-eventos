'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { cxThumb, cxVideo } from '@/lib/cloudinary';
import { db, COL } from '@/lib/firebase';
import { toast } from 'sonner';
import { useModal } from '@/components/ui/Modal';
import ImageUploader from '@/components/ui/ImageUploader';
import { Plus, Eye, EyeOff, Trash2, Filter, Search, X, Pencil, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { SUBCATS } from '@/lib/galeriaTaxonomy';

const BLANK = { categoria: 'General', subcategoria: '', tipo: 'imagen', visible: true, alt: '', albumTitle: '', albumSubtitle: '' };

// "Quinceañero de Sofía" -> "quinceanero-de-sofia" (para agrupar items del mismo evento)
function slugifyAlbum(title: string): string {
  return title
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
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

  useEffect(() => onSnapshot(
    query(collection(db, COL.GALERIA), orderBy('order', 'asc')),
    snap => { setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
  ), []);

  useEffect(() => {
    getDocs(query(collection(db, COL.SERVICIOS), orderBy('order', 'asc'))).then(snap => {
      const titles = snap.docs.map(d => (d.data() as any).title).filter(Boolean);
      setCats(['General', ...titles]);
    });
  }, []);

  // Títulos de álbum ya usados, para autocompletar y evitar que un typo
  // (ej. "Quinceañero Sofia" vs "Quinceañero de Sofía") cree un álbum duplicado.
  const albumTitles = useMemo(() => {
    const seen = new Set<string>();
    items.forEach(i => { if (i.albumTitle) seen.add(i.albumTitle); });
    return [...seen].sort();
  }, [items]);

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
      albumTitle: item.albumTitle || '',
      albumSubtitle: item.albumSubtitle || '',
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
      // Álbum: mismo título -> mismo albumId (slug), así se agrupan
      // automáticamente en la web sin necesidad de un ID manual.
      albumTitle: formData.albumTitle?.trim() || '',
      albumSubtitle: formData.albumSubtitle?.trim() || '',
      albumId: formData.albumTitle?.trim() ? slugifyAlbum(formData.albumTitle.trim()) : '',
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
            {activeCount} visibles · {hiddenCount} ocultas
            {filterCat !== 'Todas' && ` · filtrando: "${filterCat}"`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <Link href="/dashboard/galeria/importar" style={{
            display: 'flex', alignItems: 'center', gap: 6, background: '#d4a017', color: '#0a1628',
            border: 'none', borderRadius: 10, padding: '0.6rem 1rem', fontWeight: 700,
            fontSize: '0.82rem', textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            <Sparkles size={15} /> Importar de Google Photos
          </Link>
          <button onClick={openAdd} className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            <Plus size={16} /> Agregar
          </button>
        </div>
      </div>

      {/* Info */}
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

      {/* Formulario add / edit */}
      {mode !== 'idle' && (
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

              {/* Álbum — agrupa varias fotos/videos del mismo evento en una
                  sola tarjeta en la galería pública. Deja vacío para que el
                  item se muestre suelto, como hoy. */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Álbum (opcional)
                </label>
                <input type="text" list="album-titles" value={formData.albumTitle || ''}
                  onChange={e => setFormData((p: any) => ({ ...p, albumTitle: e.target.value }))}
                  placeholder="Ej: Quinceañero de Sofía" className="admin-input" />
                <datalist id="album-titles">
                  {albumTitles.map(t => <option key={t} value={t} />)}
                </datalist>
                <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '6px 0 0' }}>
                  Usa exactamente el mismo texto en todas las fotos/videos de un mismo evento para que se agrupen juntas.
                </p>
                {formData.albumTitle && (
                  <input type="text" value={formData.albumSubtitle || ''}
                    onChange={e => setFormData((p: any) => ({ ...p, albumSubtitle: e.target.value }))}
                    placeholder="Subtítulo opcional, ej: Temática Bella y Bestia"
                    className="admin-input" style={{ marginTop: 8 }} />
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

      {/* Barra de búsqueda + filtros */}
      {!loading && items.length > 0 && (
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

      {/* Grid de imágenes */}
      {loading ? (
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
          {filtrados.map(item => (
            <div key={item.id}
              style={{
                position: 'relative', borderRadius: 14, overflow: 'hidden', aspectRatio: '4/3',
                border: item.visible ? 'none' : '2px solid #fde68a',
                opacity: item.visible ? 1 : .65,
                background: '#e2e8f0',
                boxShadow: '0 2px 8px rgba(10,22,40,0.08)',
                transition: 'transform .2s, box-shadow .2s'
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 20px rgba(10,22,40,0.15)'; const ov = el.querySelector('.adm-ov') as HTMLElement | null; if (ov) ov.style.opacity = '1'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 2px 8px rgba(10,22,40,0.08)'; const ov = el.querySelector('.adm-ov') as HTMLElement | null; if (ov) ov.style.opacity = '0'; }}>

              {item.url && (
                item.tipo === 'video' || item.url?.match(/\.(mp4|webm|mov)(\?|$)/i)
                  ? <video src={cxVideo(item.url)} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <img src={cxThumb(item.url)} alt={item.alt || 'Evento'} loading="lazy" decoding="async"
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      objectPosition: `${(item.focalX ?? 0.5) * 100}% ${(item.focalY ?? 0.5) * 100}%`
                    }} />
              )}

              {/* Overlay con acciones */}
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

              {/* Badge categoría */}
              <div style={{ position: 'absolute', bottom: 6, left: 6, pointerEvents: 'none' }}>
                <span style={{
                  display: 'block', background: 'rgba(10,22,40,.8)', color: '#fff',
                  fontSize: '0.58rem', padding: '1px 7px', borderRadius: 999, marginBottom: 2
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
              </div>

              {!item.visible && (
                <div style={{
                  position: 'absolute', top: 6, right: 6, background: '#f59e0b', color: '#0a1628',
                  fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, pointerEvents: 'none'
                }}>
                  OCULTO
                </div>
              )}

              {(item.tipo === 'video' || item.url?.match(/\.(mp4|webm|mov)$/i)) && (
                <div style={{
                  position: 'absolute', top: 6, left: 6, background: 'rgba(10,22,40,.8)', color: '#fff',
                  fontSize: '0.65rem', padding: '2px 7px', borderRadius: 999, pointerEvents: 'none'
                }}>
                  🎬
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
