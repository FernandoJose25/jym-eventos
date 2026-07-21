'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { validateFile } from '@/lib/file-validation';
import { uploadFile } from '@/lib/upload';
import { compressVideoIfHeavy } from '@/lib/videoCompress';
import {
  CropModal, normalizeExifOrientation, applyCropToFile, loadWatermarkImg,
  resolveFileKind, compressImageIfNeeded, WATERMARK_LOGO_URL,
  type FP, type CropBox, type Filters, type Watermark,
} from '@/components/ui/ImageUploader';
import VideoEditorModal from '@/components/ui/VideoEditorModal';
import { CheckSquare, Square, X, Pencil, UploadCloud } from 'lucide-react';

interface QueueItem {
  qid: string;
  file: File;
  kind: 'image' | 'video';
  previewUrl: string;
  status: 'pending' | 'editing' | 'uploading' | 'done' | 'error';
  progress: number;
  errorMsg?: string;
  categoria: string;
  subcategoria: string;
  albumId: string;
}

interface Props {
  cats: string[];
  albumesDisponibles: { id: string; titulo: string }[];
  subcatsDeCategoria: (categoria: string) => string[];
  onUploaded: (item: {
    url: string; tipo: 'imagen' | 'video'; categoria: string; subcategoria: string; albumId: string;
  }) => Promise<void>;
  onClose: () => void;
  /** Archivos ya elegidos (ej. desde el botón "Agregar" al detectar selección múltiple) — se precargan en la cola al montar. */
  initialFiles?: File[];
}

/**
 * Cola de subida masiva para la galería: selecciona N archivos del
 * dispositivo, agrupa un subconjunto para asignarle categoría/subcategoría/
 * álbum en lote (mismo patrón que la selección múltiple del grid), y deja
 * pasar cada foto/video por el mismo editor de recorte/filtros/marca de
 * agua que el flujo de una sola imagen — o saltarlo para todas de una vez.
 */
export default function BulkGalleryUpload({ cats, albumesDisponibles, subcatsDeCategoria, onUploaded, onClose, initialFiles }: Props) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignCategoria, setAssignCategoria] = useState('');
  const [assignSubcategoria, setAssignSubcategoria] = useState('');
  const [assignAlbumId, setAssignAlbumId] = useState('');
  const [editingQid, setEditingQid] = useState<string | null>(null);
  const [editAllMode, setEditAllMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const items: QueueItem[] = [];
    for (const file of arr) {
      const validation = await validateFile(file);
      if (!validation.ok) continue;
      const kind = resolveFileKind(file, true);
      if (!kind) continue;
      items.push({
        qid: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file, kind,
        previewUrl: URL.createObjectURL(file),
        status: 'pending', progress: 0,
        categoria: 'General', subcategoria: '', albumId: '',
      });
    }
    setQueue(q => [...q, ...items]);
  }, []);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  };

  // Precarga los archivos pasados desde fuera (ej. selección múltiple en "Agregar") una sola vez al montar.
  const initialFilesLoadedRef = useRef(false);
  useEffect(() => {
    if (initialFilesLoadedRef.current) return;
    initialFilesLoadedRef.current = true;
    if (initialFiles?.length) addFiles(initialFiles);
  }, [initialFiles, addFiles]);

  const toggleSelected = (qid: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(qid) ? next.delete(qid) : next.add(qid);
    return next;
  });

  const removeItem = (qid: string) => {
    setQueue(q => q.filter(i => i.qid !== qid));
    setSelected(s => { const n = new Set(s); n.delete(qid); return n; });
  };

  const applyAssignment = () => {
    if (selected.size === 0 || !assignCategoria) return;
    setQueue(q => q.map(i => selected.has(i.qid)
      ? { ...i, categoria: assignCategoria, subcategoria: assignSubcategoria, albumId: assignAlbumId }
      : i));
    setSelected(new Set());
    setAssignCategoria(''); setAssignSubcategoria(''); setAssignAlbumId('');
  };

  const updateItem = (qid: string, patch: Partial<QueueItem>) =>
    setQueue(q => q.map(i => (i.qid === qid ? { ...i, ...patch } : i)));

  const uploadOne = useCallback(async (item: QueueItem, fileOverride?: File) => {
    updateItem(item.qid, { status: 'uploading', progress: 0 });
    try {
      const raw = fileOverride ?? item.file;
      // Los videos crudos de celular (20+ Mbps) se comprimen solos antes de
      // subir — la primera mitad de la barra es compresión, la segunda subida.
      const fileToUpload = item.kind === 'video'
        ? await compressVideoIfHeavy(raw, pct => updateItem(item.qid, { progress: Math.round(pct / 2) }))
        : await compressImageIfNeeded(raw);
      const url = await uploadFile(fileToUpload, 'galeria', pct => updateItem(item.qid, { progress: 50 + Math.round(pct / 2) }));
      await onUploaded({
        url, tipo: item.kind === 'video' ? 'video' : 'imagen',
        categoria: item.categoria, subcategoria: item.subcategoria, albumId: item.albumId,
      });
      updateItem(item.qid, { status: 'done', progress: 100 });
    } catch (e: any) {
      updateItem(item.qid, { status: 'error', errorMsg: e?.message || 'Error al subir' });
    }
  }, [onUploaded]);

  /** Sube todas las pendientes sin pasar por el editor. */
  const uploadAllSkippingEditor = async () => {
    setBusy(true);
    const pending = queue.filter(i => i.status === 'pending' || i.status === 'error');
    for (const item of pending) await uploadOne(item);
    setBusy(false);
  };

  /** Abre el editor para la primera foto/video pendiente; al aplicar/saltar,
   *  sube y avanza a la siguiente — hasta agotar la cola. */
  const startEditAll = () => {
    setEditAllMode(true);
    const next = queue.find(i => i.status === 'pending' || i.status === 'error');
    if (next) setEditingQid(next.qid);
    else setEditAllMode(false);
  };

  const advanceAfterEdit = () => {
    setEditingQid(null);
    if (!editAllMode) return;
    setQueue(currentQueue => {
      const next = currentQueue.find(i => i.status === 'pending' || i.status === 'error');
      if (next) setEditingQid(next.qid);
      else setEditAllMode(false);
      return currentQueue;
    });
  };

  const editingItem = editingQid ? queue.find(i => i.qid === editingQid) ?? null : null;

  const handleCropApply = useCallback(async (
    box: CropBox, displayW: number, displayH: number, img: HTMLImageElement,
    filters: Filters, quality: number, upscale: number,
    watermark: Watermark, logoUrl: string,
  ): Promise<void> => {
    if (!editingItem) return;
    let wm: { img: HTMLImageElement; x: number; y: number; scale: number } | undefined;
    if (watermark.enabled && logoUrl) {
      const wmImg = await loadWatermarkImg(logoUrl);
      if (wmImg) wm = { img: wmImg, x: watermark.x, y: watermark.y, scale: watermark.scale };
    }
    const cropped = await applyCropToFile(img, box, displayW, displayH,
      editingItem.file.name, filters, quality, upscale, wm);
    advanceAfterEdit();
    uploadOne(editingItem, cropped);
  }, [editingItem, uploadOne]);

  const handleCropSkip = () => {
    if (!editingItem) return;
    const item = editingItem;
    advanceAfterEdit();
    uploadOne(item);
  };

  const handleVideoApply = async (file: File) => {
    if (!editingItem) return;
    const item = editingItem;
    advanceAfterEdit();
    uploadOne(item, file);
  };

  const handleVideoSkip = () => {
    if (!editingItem) return;
    const item = editingItem;
    advanceAfterEdit();
    uploadOne(item);
  };

  const [normalizedSrc, setNormalizedSrc] = useState<{ qid: string; src: string } | null>(null);
  const currentDisplaySrc = editingItem && normalizedSrc?.qid === editingItem.qid
    ? normalizedSrc.src
    : editingItem?.previewUrl ?? '';

  // Al abrir un item de imagen en el editor, hornea la orientación EXIF una
  // vez (igual que ImageUploader) antes de mostrarlo en el CropModal.
  const preparingRef = useRef<string | null>(null);
  if (editingItem && editingItem.kind === 'image' && preparingRef.current !== editingItem.qid) {
    preparingRef.current = editingItem.qid;
    normalizeExifOrientation(editingItem.file).then(normalized => {
      setNormalizedSrc({ qid: editingItem.qid, src: URL.createObjectURL(normalized) });
      updateItem(editingItem.qid, { file: normalized });
    });
  }

  const pendingCount = queue.filter(i => i.status === 'pending' || i.status === 'error').length;
  const doneCount = queue.filter(i => i.status === 'done').length;
  const subcats = assignCategoria ? subcatsDeCategoria(assignCategoria) : [];

  return (
    <div className="admin-card" style={{ padding: '1.5rem', animation: 'slideUp .3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0a1628', margin: 0 }}>
          📤 Subida masiva ({queue.length} archivo{queue.length === 1 ? '' : 's'}
          {doneCount > 0 ? ` · ${doneCount} subido${doneCount === 1 ? '' : 's'}` : ''})
        </h3>
        <button onClick={onClose} className="btn-outline" type="button">Cerrar</button>
      </div>

      <input ref={inputRef} type="file" multiple accept="image/*,video/*" onChange={onPickFiles} style={{ display: 'none' }} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => inputRef.current?.click()} className="btn-primary" type="button">
          <UploadCloud size={16} /> Elegir fotos/videos del dispositivo
        </button>
        {pendingCount > 0 && (
          <>
            <button onClick={startEditAll} disabled={busy || editAllMode} className="btn-gold" type="button">
              ✂️ Editar y subir una por una ({pendingCount})
            </button>
            <button onClick={uploadAllSkippingEditor} disabled={busy || editAllMode} className="btn-outline" type="button">
              {busy ? 'Subiendo…' : `Subir las ${pendingCount} sin editar`}
            </button>
          </>
        )}
      </div>

      {queue.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', background: '#f8fafc', borderRadius: 12 }}>
          <p style={{ fontSize: '2.2rem', margin: 0 }}>🖼️</p>
          <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
            Elige varias fotos o videos de tu dispositivo para subirlos todos juntos.
          </p>
        </div>
      ) : (
        <>
          {/* Grid de la cola con selección */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 10, marginBottom: 14,
          }}>
            {queue.map(item => {
              const isSel = selected.has(item.qid);
              return (
                <div key={item.qid} onClick={() => toggleSelected(item.qid)} style={{
                  position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3',
                  background: '#e2e8f0', cursor: 'pointer',
                  border: isSel ? '2.5px solid #1e3a5f' : '1px solid #e2e8f0',
                  opacity: item.status === 'done' ? 0.55 : 1,
                }}>
                  {item.kind === 'video'
                    ? <video src={item.previewUrl} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <img src={item.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}

                  <div style={{
                    position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: 6,
                    background: isSel ? '#1e3a5f' : 'rgba(255,255,255,0.9)', border: isSel ? 'none' : '1.5px solid #cbd5e1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSel && <CheckSquare size={13} color="#fff" />}
                  </div>

                  {item.status !== 'done' && (
                    <button onClick={e => { e.stopPropagation(); removeItem(item.qid); }} title="Quitar"
                      style={{
                        position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 6,
                        background: 'rgba(10,22,40,.75)', border: 'none', color: '#fca5a5', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      <X size={12} />
                    </button>
                  )}

                  <button onClick={e => { e.stopPropagation(); setEditAllMode(false); setEditingQid(item.qid); }}
                    title="Editar esta foto/video" disabled={item.status === 'done' || item.status === 'uploading'}
                    style={{
                      position: 'absolute', bottom: 6, right: 6, width: 24, height: 24, borderRadius: 7,
                      background: 'rgba(212,160,23,.9)', border: 'none', color: '#0a1628', cursor: 'pointer',
                      display: item.status === 'done' || item.status === 'uploading' ? 'none' : 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                    <Pencil size={12} />
                  </button>

                  <div style={{
                    position: 'absolute', bottom: 6, left: 6, background: 'rgba(10,22,40,.8)', color: '#fff',
                    fontSize: '0.55rem', padding: '1px 6px', borderRadius: 999, pointerEvents: 'none', maxWidth: '70%',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.categoria}{item.subcategoria ? ` · ${item.subcategoria}` : ''}
                  </div>

                  {item.status === 'uploading' && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(10,22,40,.55)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '0.72rem', fontWeight: 700,
                    }}>
                      {item.progress}%
                    </div>
                  )}
                  {item.status === 'done' && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(34,197,94,.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.3rem',
                    }}>
                      ✓
                    </div>
                  )}
                  {item.status === 'error' && (
                    <div title={item.errorMsg} style={{
                      position: 'absolute', inset: 0, background: 'rgba(239,68,68,.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.1rem',
                    }}>
                      ⚠️
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Barra de asignación en lote — mismo patrón que la selección múltiple del grid */}
          {selected.size > 0 && (
            <div style={{
              background: '#0a1628', borderRadius: 14, padding: '0.85rem 1rem',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14,
            }}>
              <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {selected.size} seleccionada{selected.size === 1 ? '' : 's'}
              </span>
              <select value={assignCategoria}
                onChange={e => { setAssignCategoria(e.target.value); setAssignSubcategoria(''); }}
                style={{ borderRadius: 8, border: 'none', padding: '0.5rem 0.6rem', fontSize: '0.8rem', minWidth: 150 }}>
                <option value="">Elegir categoría…</option>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {assignCategoria && subcats.length > 0 && (
                <select value={assignSubcategoria} onChange={e => setAssignSubcategoria(e.target.value)}
                  style={{ borderRadius: 8, border: 'none', padding: '0.5rem 0.6rem', fontSize: '0.8rem', minWidth: 140 }}>
                  <option value="">Sin subcategoría</option>
                  {subcats.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              {assignCategoria && (
                <select value={assignAlbumId} onChange={e => setAssignAlbumId(e.target.value)}
                  style={{ borderRadius: 8, border: 'none', padding: '0.5rem 0.6rem', fontSize: '0.8rem', minWidth: 150 }}>
                  <option value="">Sin álbum</option>
                  {albumesDisponibles.map(a => <option key={a.id} value={a.id}>{a.titulo}</option>)}
                </select>
              )}
              {assignCategoria && (
                <button onClick={applyAssignment}
                  style={{ background: '#d4a017', color: '#0a1628', border: 'none', borderRadius: 8, padding: '0.5rem 0.8rem', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                  Aplicar a seleccionadas
                </button>
              )}
              <button onClick={() => setSelected(new Set())}
                style={{ background: 'transparent', color: 'rgba(255,255,255,.6)', border: 'none', fontSize: '0.78rem', cursor: 'pointer' }}>
                Cancelar selección
              </button>
            </div>
          )}

          {queue.length > 0 && selected.size === 0 && (
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 14px' }}>
              💡 Toca varias fotos/videos para seleccionarlos y asignarles categoría, subcategoría o álbum en conjunto.
            </p>
          )}
        </>
      )}

      {/* Editor individual — mismo CropModal / VideoEditorModal que la subida de 1 archivo */}
      {editingItem && editingItem.kind === 'image' && currentDisplaySrc && (
        <CropModal
          src={currentDisplaySrc}
          onApply={handleCropApply}
          onSkip={handleCropSkip}
        />
      )}
      {editingItem && editingItem.kind === 'video' && (
        <VideoEditorModal
          src={editingItem.previewUrl}
          onApply={handleVideoApply}
          onSkip={handleVideoSkip}
        />
      )}
    </div>
  );
}
