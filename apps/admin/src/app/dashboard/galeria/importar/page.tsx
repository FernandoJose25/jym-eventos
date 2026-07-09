'use client';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { collection, doc, getDocs, query, orderBy, setDoc } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { getToken } from '@/lib/get-token';
import { SUBCATS, CATEGORIAS } from '@/lib/galeriaTaxonomy';
import { toast } from 'sonner';
import {
  ArrowLeft, ImagePlus, Loader2, CheckCircle2, XCircle, Sparkles,
  AlertTriangle, Trash2, Save, Pencil, UserPlus, LogOut, CircleUserRound,
} from 'lucide-react';
import {
  createPickerSession, pollPickerSession,
  listPickedMediaItems, deletePickerSession, fetchMediaBlob, parseDurationMs,
  getGooglePhotosAuthCode, listarCuentasGoogle, conectarCuentaGoogle,
  obtenerAccessTokenDeCuenta, desconectarCuentaGoogle,
  type PickedMediaItem, type CuentaGoogle,
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
  eventoNombre: string;   // grupo/evento al que pertenece esta foto (editable)
}

type Fase = 'idle' | 'conectando' | 'esperando-seleccion' | 'listando' | 'revision' | 'guardando';

const FOLDER = 'jym/galeria-importada';
const CONCURRENCIA = 3;
const LOTE_IA = 4;            // fotos por llamada a la IA (agrupación necesita ver varias juntas)
const LOTES_EN_PARALELO = 2;  // para no pasarnos del límite gratuito de Groq (tokens/minuto)

// Colores para distinguir grupos de evento en pantalla
const COLORES_GRUPO = ['#1e3a5f', '#b45309', '#0f766e', '#7c3aed', '#be123c', '#4d7c0f', '#0369a1', '#a16207'];
function colorDeGrupo(nombre: string) {
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
  return COLORES_GRUPO[h % COLORES_GRUPO.length];
}
function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'evento';
}
// Inserta una transformación de Cloudinary para mandar a la IA una versión liviana (menos tokens = menos costo)
function urlParaClasificar(url: string) {
  return url.includes('/upload/') ? url.replace('/upload/', '/upload/w_700,q_auto,f_auto/') : url;
}

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

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
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
  const eventosDetectadosRef = useRef<string[]>([]); // nombres de evento vistos en esta sesión, para que la IA los reutilice

  // ── Cuentas de Google Photos conectadas de forma persistente (como iCloud:
  // quedan guardadas hasta que el usuario le da "Desconectar") ──
  const [cuentas, setCuentas] = useState<CuentaGoogle[]>([]);
  const [cargandoCuentas, setCargandoCuentas] = useState(true);
  const [conectandoNueva, setConectandoNueva] = useState(false);
  const [desconectando, setDesconectando] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const idToken = await getToken();
        const lista = await listarCuentasGoogle(idToken);
        setCuentas(lista);
      } catch {
        // Si falla (ej. primera vez, sin nada guardado aún) simplemente no mostramos cuentas
      } finally {
        setCargandoCuentas(false);
      }
    })();
  }, []);

  const actualizarFila = useCallback((id: string, patch: Partial<FilaFoto>) => {
    setFilas(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  /* ── Abre el selector de Google Photos ya con un access_token en mano ── */
  const abrirSelectorConToken = async (token: string) => {
    googleTokenRef.current = token;
    try {
      const session = await createPickerSession(token);
      sessionIdRef.current = session.id;
      window.open(session.pickerUri, '_blank', 'noopener,noreferrer');

      setFase('esperando-seleccion');
      const intervalo = parseDurationMs(session.pollingConfig?.pollInterval, 3000);
      const timeoutMs = parseDurationMs(session.pollingConfig?.timeoutIn, 5 * 60 * 1000);
      const deadline = Date.now() + timeoutMs;

      const poll = async () => {
        if (Date.now() > deadline) {
          setErrorGlobal('El tiempo para elegir fotos expiró. Presiona "Elegir fotos" de nuevo.');
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
      setErrorGlobal(e.message || 'No se pudo abrir el selector de Google Photos');
      setFase('idle');
    }
  };

  /* ── 1a. Usar una cuenta YA conectada — sin popup, sin volver a iniciar sesión ── */
  const handleUsarCuenta = async (email: string) => {
    setErrorGlobal('');
    setFase('conectando');
    try {
      const idToken = await getToken();
      const accessToken = await obtenerAccessTokenDeCuenta(email, idToken);
      await abrirSelectorConToken(accessToken);
    } catch (e: any) {
      setErrorGlobal(e.message || 'No se pudo usar esa cuenta de Google Photos');
      setFase('idle');
      // Si la sesión guardada ya no sirve (el usuario la revocó desde Google), la quitamos de la lista
      setCuentas(prev => prev.filter(c => c.email !== email));
    }
  };

  /* ── 1b. Agregar una cuenta nueva (o la primera) — pide login + guarda el permiso persistente ── */
  const handleAgregarCuenta = async () => {
    setErrorGlobal('');
    setConectandoNueva(true);
    setFase('conectando');
    try {
      const idToken = await getToken();
      const code = await getGooglePhotosAuthCode(cuentas.length > 0);
      const { email, accessToken } = await conectarCuentaGoogle(code, idToken);
      setCuentas(prev => [...prev.filter(c => c.email !== email), { email, connectedAt: new Date().toISOString() }]);
      toast.success(`Cuenta ${email} conectada. Quedará guardada hasta que la desconectes.`);
      await abrirSelectorConToken(accessToken);
    } catch (e: any) {
      setErrorGlobal(e.message || 'No se pudo conectar la cuenta de Google Photos');
      setFase('idle');
    } finally {
      setConectandoNueva(false);
    }
  };

  /* ── 1c. Desconectar una cuenta guardada ── */
  const handleDesconectarCuenta = async (email: string) => {
    setDesconectando(email);
    try {
      const idToken = await getToken();
      await desconectarCuentaGoogle(email, idToken);
      setCuentas(prev => prev.filter(c => c.email !== email));
      toast.success(`Cuenta ${email} desconectada`);
    } catch (e: any) {
      toast.error(e.message || 'No se pudo desconectar la cuenta');
    } finally {
      setDesconectando('');
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
          eventoNombre: '',
        });
      });

      // Mantener el orden original de selección
      const ordenId = items.map(i => i.id);
      nuevasFilas.sort((a, b) => ordenId.indexOf(a.id) - ordenId.indexOf(b.id));

      setFilas(nuevasFilas);
      eventosDetectadosRef.current = [];
      setFase('revision');
      deletePickerSession(sessionIdRef.current, googleTokenRef.current);
    } catch (e: any) {
      setErrorGlobal(e.message || 'No se pudieron traer las fotos elegidas');
      setFase('idle');
    }
  };

  /* ── 3. Subir a Cloudinary + clasificar y agrupar por evento con IA (Groq vision, en lotes) ── */
  const handleProcesarConIA = async () => {
    const pendientes = filas.filter(f => f.incluida && f.estado === 'pendiente');
    if (pendientes.length === 0) return;

    setProgreso({ hecho: 0, total: pendientes.length });
    const idToken = await getToken();

    // 1) Subir todas a Cloudinary primero (esto sí puede ir con más concurrencia)
    const subidas: { fila: FilaFoto; cloudinaryUrl: string }[] = [];
    await runWithConcurrency(pendientes, CONCURRENCIA, async (fila) => {
      actualizarFila(fila.id, { estado: 'procesando' });
      try {
        const blob = await fetchMediaBlob(fila.mediaItem.mediaFile.baseUrl, googleTokenRef.current, '=d');
        const cloudinaryUrl = await uploadBlobToCloudinary(blob, fila.mediaItem.mediaFile.filename, idToken);
        subidas.push({ fila, cloudinaryUrl });
      } catch (e: any) {
        actualizarFila(fila.id, { estado: 'error', error: e.message || 'Error subiendo esta foto' });
        setProgreso(p => ({ ...p, hecho: p.hecho + 1 }));
      }
    });

    // 2) Clasificar y agrupar en lotes pequeños, para que la IA compare fotos entre sí
    const lotes = chunk(subidas, LOTE_IA);
    await runWithConcurrency(lotes, LOTES_EN_PARALELO, async (lote) => {
      try {
        const res = await fetch('/api/classify-foto', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fotos: lote.map(s => ({ id: s.fila.id, url: urlParaClasificar(s.cloudinaryUrl) })),
            eventosConocidos: eventosDetectadosRef.current,
          }),
        });
        if (!res.ok) throw new Error('La IA no pudo clasificar este lote');
        const data = await res.json();
        const resultados: Record<string, any> = {};
        for (const r of data.fotos || []) resultados[r.id] = r;

        for (const s of lote) {
          const r = resultados[s.fila.id];
          if (!r) {
            actualizarFila(s.fila.id, { estado: 'error', error: 'La IA no devolvió resultado para esta foto' });
            continue;
          }
          if (r.nombreGrupo && !eventosDetectadosRef.current.includes(r.nombreGrupo)) {
            eventosDetectadosRef.current = [...eventosDetectadosRef.current, r.nombreGrupo];
          }
          actualizarFila(s.fila.id, {
            estado: 'lista',
            cloudinaryUrl: s.cloudinaryUrl,
            categoria: r.categoria,
            subcategoria: r.subcategoria,
            alt: r.alt,
            calidad: r.calidad,
            motivoCalidad: r.motivoCalidad,
            eventoNombre: r.nombreGrupo || '',
            incluida: r.calidad !== 'mala', // auto-descarta las de mala calidad, editable después
          });
        }
      } catch (e: any) {
        for (const s of lote) {
          actualizarFila(s.fila.id, { estado: 'error', error: e.message || 'Error procesando este lote' });
        }
      } finally {
        setProgreso(p => ({ ...p, hecho: p.hecho + lote.length }));
      }
    });

    toast.success('Clasificación y agrupación por evento terminada. Revisa y ajusta antes de publicar.');
  };

  /* ── 4. Guardar las aprobadas en la galería (mismo esquema que /dashboard/galeria + evento) ── */
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
        const eventoNombre = f.eventoNombre.trim();
        await setDoc(doc(db, COL.GALERIA, id), {
          url: f.cloudinaryUrl,
          alt: f.alt || f.subcategoria || f.categoria || 'Evento J&M',
          categoria: f.categoria,
          subcategoria: f.subcategoria,
          eventoId: eventoNombre ? slugify(eventoNombre) : '',
          eventoNombre,
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

  /* Renombra/fusiona un grupo entero: aplica el nuevo nombre a todas las fotos que tenían el nombre viejo */
  const renombrarGrupo = (nombreViejo: string, nombreNuevo: string) => {
    setFilas(prev => prev.map(f => (f.eventoNombre === nombreViejo ? { ...f, eventoNombre: nombreNuevo } : f)));
  };

  const totalIncluidas = filas.filter(f => f.incluida).length;
  const totalListas = filas.filter(f => f.estado === 'lista').length;
  const totalPendientes = filas.filter(f => f.incluida && f.estado === 'pendiente').length;

  // Nombres de evento existentes (para autocompletar / fusionar grupos a mano)
  const nombresDeGrupo = useMemo(() => {
    const s = new Set<string>();
    filas.forEach(f => { if (f.eventoNombre.trim()) s.add(f.eventoNombre.trim()); });
    return [...s];
  }, [filas]);

  // Agrupar filas por evento para mostrarlas en clusters, manteniendo las "sin evento" al final
  const grupos = useMemo(() => {
    const orden: string[] = [];
    const mapa = new Map<string, FilaFoto[]>();
    for (const f of filas) {
      const key = f.eventoNombre.trim() || '__sin_evento__';
      if (!mapa.has(key)) { mapa.set(key, []); orden.push(key); }
      mapa.get(key)!.push(f);
    }
    orden.sort((a, b) => (a === '__sin_evento__' ? 1 : b === '__sin_evento__' ? -1 : 0));
    return orden.map(key => ({ nombre: key === '__sin_evento__' ? '' : key, filas: mapa.get(key)! }));
  }, [filas]);

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
        Elige fotos de tu Google Photos, la IA las clasifica por categoría, calidad y las agrupa por evento; tú revisas y apruebas antes de publicar.
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {cargandoCuentas ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: '0.85rem' }}>
              <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              Revisando cuentas de Google conectadas...
            </div>
          ) : (
            <>
              {cuentas.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', margin: 0 }}>
                    Cuentas conectadas — no piden login de nuevo
                  </p>
                  {cuentas.map(c => (
                    <div key={c.email} style={{
                      display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc',
                      border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.7rem 0.9rem',
                    }}>
                      <CircleUserRound size={20} color="#1e3a5f" style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '0.85rem', color: '#0a1628', fontWeight: 600, wordBreak: 'break-all' }}>
                        {c.email}
                      </span>
                      <button onClick={() => handleUsarCuenta(c.email)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, background: '#1e3a5f', color: '#fff',
                        border: 'none', borderRadius: 8, padding: '0.5rem 0.9rem', fontWeight: 700,
                        fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>
                        <ImagePlus size={14} /> Elegir fotos
                      </button>
                      <button onClick={() => handleDesconectarCuenta(c.email)} disabled={desconectando === c.email}
                        title="Desconectar esta cuenta"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
                          background: 'transparent', border: '1px solid #fecaca', borderRadius: 8, color: '#ef4444',
                          cursor: desconectando === c.email ? 'not-allowed' : 'pointer', flexShrink: 0,
                        }}>
                        {desconectando === c.email
                          ? <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                          : <LogOut size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={handleAgregarCuenta} disabled={conectandoNueva} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: cuentas.length > 0 ? '#fff' : '#1e3a5f',
                color: cuentas.length > 0 ? '#1e3a5f' : '#fff',
                border: cuentas.length > 0 ? '1.5px solid #1e3a5f' : 'none',
                borderRadius: 12, padding: '0.85rem 1.5rem', fontWeight: 700,
                fontSize: '0.9rem', cursor: conectandoNueva ? 'not-allowed' : 'pointer', alignSelf: 'flex-start',
              }}>
                {cuentas.length > 0 ? <UserPlus size={18} /> : <ImagePlus size={18} />}
                {cuentas.length > 0 ? 'Agregar otra cuenta de Google' : 'Conectar con Google Photos'}
              </button>

              {cuentas.length > 0 && (
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
                  La sesión queda guardada — no vuelve a pedir login hasta que le des "Desconectar".
                </p>
              )}
            </>
          )}
        </div>
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
          <datalist id="lista-eventos">
            {nombresDeGrupo.map(n => <option key={n} value={n} />)}
          </datalist>

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
                ? `Clasificando y agrupando... ${progreso.hecho}/${progreso.total}`
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

          {grupos.map(grupo => (
            <div key={grupo.nombre || '__sin_evento__'} style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {grupo.nombre ? (
                  <span style={{ width: 10, height: 10, borderRadius: 4, background: colorDeGrupo(grupo.nombre), flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 10, height: 10, borderRadius: 4, background: '#cbd5e1', flexShrink: 0 }} />
                )}
                {grupo.nombre ? (
                  <input
                    list="lista-eventos"
                    value={grupo.nombre}
                    onChange={e => renombrarGrupo(grupo.nombre, e.target.value)}
                    placeholder="Nombre del evento"
                    title="Escribe el nombre exacto de otro grupo para fusionarlos"
                    style={{
                      fontSize: '0.85rem', fontWeight: 700, color: '#0a1628',
                      border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 10px',
                      minWidth: 220,
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>Sin evento asignado</span>
                )}
                <Pencil size={12} color="#94a3b8" />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{grupo.filas.length} foto(s)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
                {grupo.filas.map(f => (
                  <div key={f.id} style={{
                    border: `1.5px solid ${f.calidad === 'mala' ? '#fecaca' : (grupo.nombre ? colorDeGrupo(grupo.nombre) + '55' : '#e2e8f0')}`,
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

                      {f.estado === 'lista' && (
                        <input
                          list="lista-eventos"
                          value={f.eventoNombre}
                          onChange={e => actualizarFila(f.id, { eventoNombre: e.target.value })}
                          placeholder="Evento (opcional)"
                          title="Escribe el nombre exacto de otro grupo para moverla a ese evento"
                          style={{ fontSize: '0.72rem', padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0' }}
                        />
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
            </div>
          ))}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}