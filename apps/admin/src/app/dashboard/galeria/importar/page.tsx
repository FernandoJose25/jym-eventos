'use client';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { collection, doc, getDocs, query, orderBy, setDoc } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { authHeaders, getToken } from '@/lib/get-token';
import { SUBCATS, CATEGORIAS } from '@/lib/galeriaTaxonomy';
import { toast } from 'sonner';
import {
    ArrowLeft, ImagePlus, Loader2, CheckCircle2, XCircle, Sparkles,
    AlertTriangle, Trash2, Save,
} from 'lucide-react';
import {
    getGooglePhotosToken, createPickerSession, pollPickerSession,
    listPickedMediaItems, deletePickerSession, fetchMediaBlob, parseDurationMs,
    type PickedMediaItem,
} from '@/lib/googlePhotosPicker';

type EstadoFoto = 'pendiente' | 'procesando' | 'lista' | 'error';

interface FilaFoto {
    id: string;
    mediaItem: PickedMediaItem;
    thumb: string;          // object URL local para previsualizar
    incluida: boolean;      // ¿se procesa/publica?
    estado: EstadoFoto;
    error?: string;
    cloudinaryUrl?: string;
    categoria: string;
    subcategoria: string;
    alt: string;
    calidad: 'buena' | 'regular' | 'mala';
    motivoCalidad: string;
}

type Fase = 'idle' | 'conectando' | 'esperando-seleccion' | 'listando' | 'revision' | 'guardando';

const FOLDER = 'jym/galeria-importada';
const CONCURRENCIA = 3;

async function uploadBlobToCloudinary(blob: Blob, filename: string, idToken: string): Promise<string> {
    const signRes = await fetch('/api/cloudinary-sign', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileSize: blob.size, fileType: blob.type || 'image/jpeg', folder: FOLDER }),
    });
    if (!signRes.ok) throw new Error('No se pudo firmar la subida a Cloudinary');
    const { timestamp, signature, apiKey, cloudName } = await signRes.json();

    const form = new FormData();
    form.append('file', blob, filename);
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    form.append('folder', FOLDER);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: form,
    });
    if (!uploadRes.ok) throw new Error('Cloudinary rechazó la imagen');
    const data = await uploadRes.json();
    return data.secure_url as string;
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
    let i = 0;
    const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
        while (i < items.length) {
            const item = items[i++];
            await worker(item);
        }
    });
    await Promise.all(runners);
}

export default function ImportarDeGooglePhotosPage() {
    const [fase, setFase] = useState<Fase>('idle');
    const [filas, setFilas] = useState<FilaFoto[]>([]);
    const [progreso, setProgreso] = useState({ hecho: 0, total: 0 });
    const [errorGlobal, setErrorGlobal] = useState('');
    const googleTokenRef = useRef<string>('');
    const sessionIdRef = useRef<string>('');
    const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const actualizarFila = useCallback((id: string, patch: Partial<FilaFoto>) => {
        setFilas(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
    }, []);

    /* ── 1. Conectar con Google Photos y abrir el selector ── */
    const handleConectar = async () => {
        setErrorGlobal('');
        setFase('conectando');
        try {
            const token = await getGooglePhotosToken();
            googleTokenRef.current = token;

            const session = await createPickerSession(token);
            sessionIdRef.current = session.id;
            window.open(session.pickerUri, '_blank', 'noopener,noreferrer');

            setFase('esperando-seleccion');
            const intervalo = parseDurationMs(session.pollingConfig?.pollInterval, 3000);
            const timeoutMs = parseDurationMs(session.pollingConfig?.timeoutIn, 5 * 60 * 1000);
            const deadline = Date.now() + timeoutMs;

            const poll = async () => {
                if (Date.now() > deadline) {
                    setErrorGlobal('El tiempo para elegir fotos expiró. Presiona "Conectar" de nuevo.');
                    setFase('idle');
                    return;
                }
                const s = await pollPickerSession(sessionIdRef.current, googleTokenRef.current);
                if (s.mediaItemsSet) {
                    await cargarSeleccionadas();
                } else {
                    pollTimer.current = setTimeout(poll, intervalo);
                }
            };
            pollTimer.current = setTimeout(poll, intervalo);
        } catch (e: any) {
            setErrorGlobal(e.message || 'No se pudo conectar con Google Photos');
            setFase('idle');
        }
    };

    /* ── 2. Traer los items elegidos + generar miniaturas ── */
    const cargarSeleccionadas = async () => {
        setFase('listando');
        try {
            const items = await listPickedMediaItems(sessionIdRef.current, googleTokenRef.current);
            if (items.length === 0) {
                setErrorGlobal('No elegiste ninguna foto.');
                setFase('idle');
                return;
            }

            const nuevasFilas: FilaFoto[] = [];
            await runWithConcurrency(items, 5, async (item) => {
                const blob = await fetchMediaBlob(item.mediaFile.baseUrl, googleTokenRef.current, '=w400-h400');
                nuevasFilas.push({
                    id: item.id,
                    mediaItem: item,
                    thumb: URL.createObjectURL(blob),
                    incluida: true,
                    estado: 'pendiente',
                    categoria: 'General',
                    subcategoria: '',
                    alt: '',
                    calidad: 'buena',
                    motivoCalidad: '',
                });
            });

            // Mantener el orden original de selección
            const ordenId = items.map(i => i.id);
            nuevasFilas.sort((a, b) => ordenId.indexOf(a.id) - ordenId.indexOf(b.id));

            setFilas(nuevasFilas);
            setFase('revision');
            deletePickerSession(sessionIdRef.current, googleTokenRef.current);
        } catch (e: any) {
            setErrorGlobal(e.message || 'No se pudieron traer las fotos elegidas');
            setFase('idle');
        }
    };

    /* ── 3. Subir a Cloudinary + clasificar con IA (Groq vision) ── */
    const handleProcesarConIA = async () => {
        const pendientes = filas.filter(f => f.incluida && f.estado === 'pendiente');
        if (pendientes.length === 0) return;

        setProgreso({ hecho: 0, total: pendientes.length });
        const idToken = await getToken();

        await runWithConcurrency(pendientes, CONCURRENCIA, async (fila) => {
            actualizarFila(fila.id, { estado: 'procesando' });
            try {
                const blob = await fetchMediaBlob(fila.mediaItem.mediaFile.baseUrl, googleTokenRef.current, '=d');
                const cloudinaryUrl = await uploadBlobToCloudinary(blob, fila.mediaItem.mediaFile.filename, idToken);

                const clasifRes = await fetch('/api/classify-foto', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: cloudinaryUrl }),
                });
                if (!clasifRes.ok) throw new Error('La IA no pudo clasificar esta foto');
                const clasif = await clasifRes.json();

                actualizarFila(fila.id, {
                    estado: 'lista',
                    cloudinaryUrl,
                    categoria: clasif.categoria,
                    subcategoria: clasif.subcategoria,
                    alt: clasif.alt,
                    calidad: clasif.calidad,
                    motivoCalidad: clasif.motivoCalidad,
                    incluida: clasif.calidad !== 'mala', // auto-descarta las de mala calidad, editable después
                });
            } catch (e: any) {
                actualizarFila(fila.id, { estado: 'error', error: e.message || 'Error procesando esta foto' });
            } finally {
                setProgreso(p => ({ ...p, hecho: p.hecho + 1 }));
            }
        });

        toast.success('Clasificación con IA terminada. Revisa y ajusta antes de publicar.');
    };

    /* ── 4. Guardar las aprobadas en la galería (mismo esquema que /dashboard/galeria) ── */
    const handleGuardarEnGaleria = async () => {
        const aprobadas = filas.filter(f => f.incluida && f.estado === 'lista' && f.cloudinaryUrl);
        if (aprobadas.length === 0) {
            toast.error('No hay fotos listas y seleccionadas para guardar');
            return;
        }
        setFase('guardando');
        try {
            const snap = await getDocs(query(collection(db, COL.GALERIA), orderBy('order', 'asc')));
            let order = snap.size;

            for (const f of aprobadas) {
                order += 1;
                const id = `${Date.now()}_${f.id}`;
                await setDoc(doc(db, COL.GALERIA, id), {
                    url: f.cloudinaryUrl,
                    alt: f.alt || f.subcategoria || f.categoria || 'Evento J&M',
                    categoria: f.categoria,
                    subcategoria: f.subcategoria,
                    focalX: 0.5,
                    focalY: 0.5,
                    tipo: 'imagen',
                    visible: true,
                    order,
                    row: 1,
                    createdAt: new Date().toISOString(),
                });
            }

            toast.success(`✅ ${aprobadas.length} foto(s) agregadas a la galería`);
            setFilas(prev => prev.filter(f => !aprobadas.includes(f)));
            setFase('revision');
        } catch (e: any) {
            toast.error(e.message || 'Error guardando en la galería');
            setFase('revision');
        }
    };

    const quitarFila = (id: string) => setFilas(prev => prev.filter(f => f.id !== id));

    const totalIncluidas = filas.filter(f => f.incluida).length;
    const totalListas = filas.filter(f => f.estado === 'lista').length;
    const totalPendientes = filas.filter(f => f.incluida && f.estado === 'pendiente').length;

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>
            <Link href="/dashboard/galeria" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b',
                fontSize: '0.85rem', textDecoration: 'none', marginBottom: 16,
            }}>
                <ArrowLeft size={15} /> Volver a Galería
            </Link>

            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0a1628', marginBottom: 4 }}>
                Importar fotos de Google Photos
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 24 }}>
                Elige fotos de tu Google Photos, la IA las clasifica por categoría y calidad, tú revisas y apruebas antes de publicar.
            </p>

            {errorGlobal && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, background: '#fff1f2',
                    border: '1px solid #fecaca', color: '#9f1239', borderRadius: 10,
                    padding: '0.75rem 1rem', marginBottom: 20, fontSize: '0.85rem',
                }}>
                    <XCircle size={16} /> {errorGlobal}
                </div>
            )}

            {fase === 'idle' && (
                <button onClick={handleConectar} style={{
                    display: 'flex', alignItems: 'center', gap: 8, background: '#1e3a5f', color: '#fff',
                    border: 'none', borderRadius: 12, padding: '0.85rem 1.5rem', fontWeight: 700,
                    fontSize: '0.9rem', cursor: 'pointer',
                }}>
                    <ImagePlus size={18} /> Conectar con Google Photos
                </button>
            )}

            {(fase === 'conectando' || fase === 'esperando-seleccion' || fase === 'listando') && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc',
                    border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', fontSize: '0.88rem', color: '#334155',
                }}>
                    <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    {fase === 'conectando' && 'Abriendo autorización de Google...'}
                    {fase === 'esperando-seleccion' && 'Elige tus fotos en la pestaña que se abrió con Google Photos. Esperando tu selección...'}
                    {fase === 'listando' && 'Trayendo las fotos elegidas y generando miniaturas...'}
                </div>
            )}

            {(fase === 'revision' || fase === 'guardando') && filas.length > 0 && (
                <>
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
                        marginBottom: 18, position: 'sticky', top: 0, background: '#fff',
                        padding: '0.75rem 0', zIndex: 5,
                    }}>
                        <button onClick={handleProcesarConIA} disabled={totalPendientes === 0}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: totalPendientes === 0 ? '#e2e8f0' : '#d4a017',
                                color: totalPendientes === 0 ? '#94a3b8' : '#0a1628',
                                border: 'none', borderRadius: 10, padding: '0.7rem 1.25rem',
                                fontWeight: 700, fontSize: '0.85rem',
                                cursor: totalPendientes === 0 ? 'not-allowed' : 'pointer',
                            }}>
                            <Sparkles size={16} />
                            {progreso.total > 0 && progreso.hecho < progreso.total
                                ? `Clasificando... ${progreso.hecho}/${progreso.total}`
                                : `Clasificar con IA (${totalPendientes})`}
                        </button>

                        <button onClick={handleGuardarEnGaleria} disabled={totalListas === 0 || fase === 'guardando'}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: totalListas === 0 ? '#e2e8f0' : '#1e3a5f',
                                color: totalListas === 0 ? '#94a3b8' : '#fff',
                                border: 'none', borderRadius: 10, padding: '0.7rem 1.25rem',
                                fontWeight: 700, fontSize: '0.85rem',
                                cursor: totalListas === 0 ? 'not-allowed' : 'pointer',
                            }}>
                            <Save size={16} />
                            {fase === 'guardando' ? 'Guardando...' : `Guardar en galería (${filas.filter(f => f.incluida && f.estado === 'lista').length})`}
                        </button>

                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            {filas.length} foto(s) traídas · {totalIncluidas} incluida(s)
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
                        {filas.map(f => (
                            <div key={f.id} style={{
                                border: `1.5px solid ${f.calidad === 'mala' ? '#fecaca' : '#e2e8f0'}`,
                                borderRadius: 14, overflow: 'hidden', background: '#fff',
                                opacity: f.incluida ? 1 : 0.5,
                            }}>
                                <div style={{ position: 'relative', aspectRatio: '4/3', background: '#e2e8f0' }}>
                                    <img src={f.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', top: 6, right: 6 }}>
                                        {f.estado === 'procesando' && <Loader2 size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />}
                                        {f.estado === 'lista' && <CheckCircle2 size={16} color="#22c55e" />}
                                        {f.estado === 'error' && <AlertTriangle size={16} color="#ef4444" />}
                                    </div>
                                    <button onClick={() => quitarFila(f.id)} title="Quitar"
                                        style={{
                                            position: 'absolute', bottom: 6, right: 6, width: 26, height: 26, borderRadius: 8,
                                            background: 'rgba(10,22,40,.7)', border: 'none', color: '#fca5a5', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>

                                <div style={{ padding: '0.7rem 0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#475569' }}>
                                        <input type="checkbox" checked={f.incluida}
                                            onChange={e => actualizarFila(f.id, { incluida: e.target.checked })} />
                                        Incluir en la galería
                                    </label>

                                    {f.estado === 'error' && (
                                        <p style={{ fontSize: '0.7rem', color: '#ef4444', margin: 0 }}>{f.error}</p>
                                    )}

                                    {f.calidad === 'mala' && f.motivoCalidad && (
                                        <p style={{ fontSize: '0.68rem', color: '#b45309', background: '#fffbeb', borderRadius: 6, padding: '3px 6px', margin: 0 }}>
                                            ⚠️ {f.motivoCalidad}
                                        </p>
                                    )}

                                    <select value={f.categoria}
                                        onChange={e => actualizarFila(f.id, { categoria: e.target.value, subcategoria: '' })}
                                        style={{ fontSize: '0.78rem', padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                        {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>

                                    {(SUBCATS[f.categoria] || []).length > 0 && (
                                        <select value={f.subcategoria}
                                            onChange={e => actualizarFila(f.id, { subcategoria: e.target.value })}
                                            style={{ fontSize: '0.78rem', padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                            <option value="">Sin subcategoría</option>
                                            {(SUBCATS[f.categoria] || []).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    )}

                                    <input value={f.alt} placeholder="Descripción (alt)"
                                        onChange={e => actualizarFila(f.id, { alt: e.target.value })}
                                        style={{ fontSize: '0.78rem', padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}