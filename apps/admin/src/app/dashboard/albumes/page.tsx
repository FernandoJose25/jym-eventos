'use client';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { cxThumb } from '@/lib/cloudinary';
import { db, COL } from '@/lib/firebase';
import { toast } from 'sonner';
import { useModal } from '@/components/ui/Modal';
import ImageUploader from '@/components/ui/ImageUploader';
import { Plus, Eye, EyeOff, Trash2, Pencil, Images } from 'lucide-react';

const TIPOS_EVENTO = ['Quinceañero', 'Cumpleaños', 'Boda', 'Baby Shower', 'Corporativo', 'Bautizo', 'Graduación', 'Otro'];

function slugify(title: string): string {
    return title
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

const BLANK = {
    titulo: '', tipoEvento: '', cliente: '', fecha: new Date().toISOString().slice(0, 10),
    descripcion: '', coverUrl: '', coverFocalX: 0.5, coverFocalY: 0.5, visible: true,
};

export default function AlbumesPage() {
    const [albumes, setAlbumes] = useState<any[]>([]);
    const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<'idle' | 'add' | 'edit'>('idle');
    const [editId, setEditId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>(BLANK);
    const { open } = useModal();

    useEffect(() => onSnapshot(
        query(collection(db, COL.ALBUMES), orderBy('order', 'asc')),
        snap => { setAlbumes(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
    ), []);

    // Cuántas fotos/videos tiene cada álbum — recorre gallery_items una vez.
    useEffect(() => onSnapshot(collection(db, COL.GALERIA), snap => {
        const counts: Record<string, number> = {};
        snap.docs.forEach(d => {
            const albumId = (d.data() as any).albumId;
            if (albumId) counts[albumId] = (counts[albumId] || 0) + 1;
        });
        setItemCounts(counts);
    }), []);

    const openAdd = () => { setFormData(BLANK); setEditId(null); setMode('add'); };

    const openEdit = (album: any) => {
        setFormData({
            titulo: album.titulo || '', tipoEvento: album.tipoEvento || '', cliente: album.cliente || '',
            fecha: album.fecha || BLANK.fecha, descripcion: album.descripcion || '',
            coverUrl: album.coverUrl || '', coverFocalX: album.coverFocalX ?? 0.5, coverFocalY: album.coverFocalY ?? 0.5,
            visible: album.visible ?? true,
        });
        setEditId(album.id);
        setMode('edit');
    };

    const handleSave = async () => {
        if (!formData.titulo.trim()) { toast.error('Ponle un título al álbum'); return; }
        if (!formData.coverUrl) { toast.error('Elige una foto de portada'); return; }
        const payload = {
            titulo: formData.titulo.trim(),
            slug: slugify(formData.titulo.trim()),
            tipoEvento: formData.tipoEvento || '',
            cliente: formData.cliente || '',
            fecha: formData.fecha || '',
            descripcion: formData.descripcion || '',
            coverUrl: formData.coverUrl,
            coverFocalX: formData.coverFocalX ?? 0.5,
            coverFocalY: formData.coverFocalY ?? 0.5,
            visible: formData.visible ?? true,
        };
        if (mode === 'edit' && editId) {
            await updateDoc(doc(db, COL.ALBUMES, editId), payload);
            toast.success('✅ Álbum actualizado');
        } else {
            await addDoc(collection(db, COL.ALBUMES), { ...payload, order: albumes.length + 1, createdAt: new Date().toISOString() });
            toast.success('✅ Álbum creado');
        }
        setMode('idle'); setFormData(BLANK); setEditId(null);
    };

    const toggleVisible = (album: any) => open({
        type: album.visible ? 'hide' : 'show',
        title: album.visible ? 'Ocultar álbum' : 'Publicar álbum',
        description: album.visible
            ? 'El álbum dejará de verse en /albumes y en la tira de la galería. Sus fotos individuales no se ven afectadas.'
            : 'El álbum volverá a aparecer en la web pública.',
        collection: COL.ALBUMES,
        docId: album.id,
        field: 'visible',
    });

    const handleDelete = (album: any) => open({
        type: 'delete',
        title: 'Eliminar álbum',
        description: 'Se borra el álbum. Las fotos siguen en la galería, solo quedan sin agrupar (puedes reagruparlas después).',
        onConfirm: async () => {
            await deleteDoc(doc(db, COL.ALBUMES, album.id));
            toast.success('Álbum eliminado');
        },
    });

    const activeCount = useMemo(() => albumes.filter(a => a.visible).length, [albumes]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', fontWeight: 700, color: '#0a1628', margin: 0 }}>Álbumes</h1>
                    <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 4 }}>
                        {activeCount} publicados de {albumes.length}
                    </p>
                </div>
                <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Nuevo álbum</button>
            </div>

            <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12,
                padding: '0.875rem 1.25rem', display: 'flex', gap: 10, alignItems: 'flex-start'
            }}>
                <span style={{ fontSize: '1.1rem' }}>💡</span>
                <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
                    Un álbum agrupa varias fotos/videos de un mismo evento con su propia página en la web
                    (<code>jmdecoracionesyeventos.vercel.app/albumes/tu-slug</code>). Créalo aquí primero, luego ve a{' '}
                    <strong>Galería</strong>, selecciona las fotos de ese evento y usa "Agregar a álbum".
                </p>
            </div>

            {mode !== 'idle' && (
                <div className="admin-card" style={{ padding: '1.5rem', animation: 'slideUp .3s ease' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0a1628', margin: '0 0 16px' }}>
                        {mode === 'edit' ? '✏️ Editar álbum' : 'Nuevo álbum'}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                            <ImageUploader
                                key={editId ?? 'new'}
                                label="Portada del álbum"
                                folder="albumes"
                                acceptVideo={false}
                                value={formData.coverUrl}
                                focal={{ x: formData.coverFocalX ?? 0.5, y: formData.coverFocalY ?? 0.5 }}
                                previewAspect={4 / 5} previewLabel="Portada (retrato 4:5)"
                                onComplete={(url, fp) => setFormData((p: any) => ({ ...p, coverUrl: url, coverFocalX: fp.x, coverFocalY: fp.y }))}
                            />
                            <p style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 6 }}>
                                Tip: sube tu mejor foto del evento — es la que la gente ve primero en /albumes.
                            </p>
                        </div>

                        <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                                    Título *
                                </label>
                                <input type="text" value={formData.titulo}
                                    onChange={e => setFormData((p: any) => ({ ...p, titulo: e.target.value }))}
                                    placeholder="Ej: Quinceañero de Sofía" className="admin-input" />
                                {formData.titulo && (
                                    <p style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 4 }}>
                                        URL: /albumes/{slugify(formData.titulo)}
                                    </p>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                                        Tipo de evento
                                    </label>
                                    <select value={formData.tipoEvento}
                                        onChange={e => setFormData((p: any) => ({ ...p, tipoEvento: e.target.value }))}
                                        className="admin-input">
                                        <option value="">— Sin especificar —</option>
                                        {TIPOS_EVENTO.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                                        Fecha del evento
                                    </label>
                                    <input type="date" value={formData.fecha}
                                        onChange={e => setFormData((p: any) => ({ ...p, fecha: e.target.value }))}
                                        className="admin-input" />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                                    Cliente (opcional, no se muestra en público si lo dejas vacío)
                                </label>
                                <input type="text" value={formData.cliente}
                                    onChange={e => setFormData((p: any) => ({ ...p, cliente: e.target.value }))}
                                    placeholder="Ej: Familia Rodríguez" className="admin-input" />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                                    Descripción (opcional)
                                </label>
                                <textarea value={formData.descripcion}
                                    onChange={e => setFormData((p: any) => ({ ...p, descripcion: e.target.value }))}
                                    placeholder="Breve historia del evento, para el detalle del álbum y el SEO"
                                    className="admin-input" rows={3} />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#0a1628', cursor: 'pointer' }}>
                                <input type="checkbox" checked={formData.visible}
                                    onChange={e => setFormData((p: any) => ({ ...p, visible: e.target.checked }))} />
                                Publicado (visible en la web)
                            </label>

                            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                                <button onClick={handleSave} className="btn-primary">Guardar</button>
                                <button onClick={() => { setMode('idle'); setFormData(BLANK); setEditId(null); }}
                                    style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, padding: '0.6rem 1.25rem', fontWeight: 600, cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
                    {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '4/5', borderRadius: 14 }} />)}
                </div>
            ) : albumes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                    <Images size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                    <p style={{ color: '#64748b' }}>Aún no creas ningún álbum. Empieza con el botón "Nuevo álbum".</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
                    {albumes.map(album => (
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
                                    🖼️ {itemCounts[album.id] || 0} {itemCounts[album.id] === 1 ? 'item' : 'items'}
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
                                    <button onClick={() => openEdit(album)} title="Editar"
                                        style={{ flex: 1, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Pencil size={13} />
                                    </button>
                                    <button onClick={() => toggleVisible(album)} title={album.visible ? 'Ocultar' : 'Publicar'}
                                        style={{ flex: 1, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {album.visible ? <EyeOff size={13} /> : <Eye size={13} />}
                                    </button>
                                    <button onClick={() => handleDelete(album)} title="Eliminar"
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
    );
}
