'use client';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { collection, doc, getDocs, query, orderBy, setDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { getToken } from '@/lib/get-token';
import { SUBCATS, CATEGORIAS } from '@/lib/galeriaTaxonomy';
import { toast } from 'sonner';
import {
  ArrowLeft, ImagePlus, Loader2, CheckCircle2, XCircle, Sparkles,
  AlertTriangle, Trash2, Save, Pencil, UserPlus, LogOut, CircleUserRound, Video,
} from 'lucide-react';
import {
  createPickerSession, pollPickerSession,
  listPickedMediaItems, deletePickerSession, fetchMediaBlob, parseDurationMs,
  getGooglePhotosAuthCode, listarCuentasGoogle, conectarCuentaGoogle,
  obtenerAccessTokenDeCuenta, desconectarCuentaGoogle,
  type PickedMediaItem, type CuentaGoogle,
} from '@/lib/googlePhotosPicker';
import {
  listarAlbumICloud, importarDeICloud,
  listarCuentasICloud, conectarAlbumICloud, alternarAutoSyncICloud,
  desconectarAlbumICloud, sincronizarAlbumesICloud,
  type ICloudItem, type CuentaICloud,
} from '@/lib/icloudSharedAlbum';

type EstadoFoto = 'pendiente' | 'procesando' | 'lista' | 'error';
type Fuente = 'google' | 'icloud';

interface FilaFoto {
  id: string;
  origen: Fuente;
  mediaItem?: PickedMediaItem;  // solo cuando origen === 'google'
  icloudItem?: ICloudItem;      // solo cuando origen === 'icloud'
  thumb: string;          // object URL local (Google) o URL remota de Apple (iCloud) para previsualizar
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
  clasificada: boolean;   // true una vez que la IA ya la clasificó (independiente de si se subió o no)
  tipo: 'imagen' | 'video';
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
  const [fuente, setFuente] = useState<Fuente>('google');
  const [filas, setFilas] = useState<FilaFoto[]>([]);
  const [progreso, setProgreso] = useState({ hecho: 0, total: 0 });
  const [errorGlobal, setErrorGlobal] = useState('');
  const googleTokenRef = useRef<string>('');
  const sessionIdRef = useRef<string>('');
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventosDetectadosRef = useRef<string[]>([]); // nombres de evento vistos en esta sesión, para que la IA los reutilice

  // ── iCloud: álbum compartido (link público, sin login de por medio, pero
  // con SESIÓN GUARDADA — igual que las cuentas de Google Photos, no hay que
  // volver a pegar el link cada vez que se entra a Galería, y las fotos
  // nuevas que aparezcan en el álbum se auto-importan solas) ──
  const [icloudUrl, setIcloudUrl] = useState('');
  const [icloudNombre, setIcloudNombre] = useState('');
  const [cuentasICloud, setCuentasICloud] = useState<CuentaICloud[]>([]);
  const [cargandoICloud, setCargandoICloud] = useState(true);
  const [conectandoICloud, setConectandoICloud] = useState(false);
  const [sincronizando, setSincronizando] = useState<string>(''); // id del álbum sincronizando ahora, o 'all'
  const [desconectandoICloud, setDesconectandoICloud] = useState('');

  const recargarCuentasICloud = async () => {
    try {
      const idToken = await getToken();
      setCuentasICloud(await listarCuentasICloud(idToken));
    } catch {
      // primera vez / sin nada guardado aún: no mostramos nada
    } finally {
      setCargandoICloud(false);
    }
  };
  useEffect(() => { recargarCuentasICloud(); }, []);

  // Álbumes reales ya existentes (colección `albums`) — el mismo sistema
  // que usa el formulario manual de Galería y /dashboard/albumes.
  const [albumesExistentes, setAlbumesExistentes] = useState<{ id: string; titulo: string }[]>([]);
  useEffect(() => onSnapshot(query(collection(db, COL.ALBUMES), orderBy('order', 'asc')), snap => {
    setAlbumesExistentes(snap.docs.map(d => ({ id: d.id, titulo: (d.data() as any).titulo || '' })));
  }), []);

  // Por cada nombre de grupo (evento) detectado: a qué álbum real se
  // vincula. '' = crear álbum nuevo con ese nombre al guardar.
  const [grupoAlbumId, setGrupoAlbumId] = useState<Record<string, string>>({});

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
          origen: 'google',
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
          clasificada: false,
          tipo: 'imagen',
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

  /* ── 2b. iCloud: cargar álbum compartido por link (sin login, sin OAuth) ── */
  const cargarItemsICloudEnGrid = (items: ICloudItem[]) => {
    const nuevasFilas: FilaFoto[] = items.map(item => ({
      id: item.id,
      origen: 'icloud',
      icloudItem: item,
      thumb: item.thumbUrl, // URL directa de Apple — no necesita CORS solo para mostrarla en un <img>
      incluida: true,
      estado: 'pendiente',
      categoria: 'General',
      subcategoria: '',
      alt: '',
      calidad: 'buena',
      motivoCalidad: '',
      eventoNombre: '',
      clasificada: item.tipo === 'video', // los videos no pasan por la IA — se dan por "clasificados" para no bloquear el flujo
      tipo: item.tipo,
    }));
    setFilas(nuevasFilas);
    eventosDetectadosRef.current = [];
    setFase('revision');
  };

  /* ── iCloud: conectar y GUARDAR un álbum de forma persistente — desde ahora
     queda guardado (no hay que volver a pegar el link) y las fotos NUEVAS que
     se agreguen a ese álbum compartido se auto-importan solas. ── */
  const handleConectarICloud = async () => {
    if (!icloudUrl.trim()) return;
    setErrorGlobal('');
    setConectandoICloud(true);
    setFase('listando');
    try {
      const idToken = await getToken();
      const { items } = await conectarAlbumICloud(icloudUrl.trim(), icloudNombre.trim(), idToken);
      toast.success('Álbum de iCloud conectado y guardado. Las fotos nuevas que agregues ahí se importarán solas.');
      setIcloudUrl('');
      setIcloudNombre('');
      await recargarCuentasICloud();
      if (items.length > 0) cargarItemsICloudEnGrid(items);
      else setFase('idle');
    } catch (e: any) {
      setErrorGlobal(e.message || 'No se pudo conectar el álbum de iCloud');
      setFase('idle');
    } finally {
      setConectandoICloud(false);
    }
  };

  /* ── iCloud: abrir un álbum YA guardado (sin pegar el link de nuevo) ── */
  const handleUsarAlbumICloud = async (cuenta: CuentaICloud) => {
    setErrorGlobal('');
    setFase('listando');
    try {
      const idToken = await getToken();
      const items = await listarAlbumICloud(cuenta.url, idToken);
      if (items.length === 0) {
        setErrorGlobal('No se encontraron fotos en ese álbum (o está vacío).');
        setFase('idle');
        return;
      }
      cargarItemsICloudEnGrid(items);
    } catch (e: any) {
      setErrorGlobal(e.message || 'No se pudo leer el álbum de iCloud');
      setFase('idle');
    }
  };

  /* ── iCloud: forzar sincronización ahora (trae solo las fotos nuevas desde la
     última vez, las clasifica con IA y las guarda directo en la galería como
     pendientes de aprobar — lo mismo que hace el cron automático). ── */
  const handleSincronizarICloud = async (id?: string) => {
    setSincronizando(id || 'all');
    try {
      const idToken = await getToken();
      const resultados = await sincronizarAlbumesICloud(idToken, id);
      const nuevas = resultados.reduce((acc, r) => acc + r.nuevas, 0);
      const conError = resultados.find(r => r.error);
      if (conError) toast.error(conError.error!);
      else if (nuevas > 0) toast.success(`${nuevas} foto(s) nueva(s) importada(s) y clasificada(s). Revísalas en Galería antes de publicarlas.`);
      else toast.success('Todo al día — no había fotos nuevas.');
      await recargarCuentasICloud();
    } catch (e: any) {
      toast.error(e.message || 'No se pudo sincronizar');
    } finally {
      setSincronizando('');
    }
  };

  /* ── iCloud: pausar/reanudar la auto-importación de un álbum guardado ── */
  const handleAlternarAutoSyncICloud = async (cuenta: CuentaICloud) => {
    try {
      const idToken = await getToken();
      await alternarAutoSyncICloud(cuenta.id, !cuenta.autoSync, idToken);
      setCuentasICloud(prev => prev.map(c => c.id === cuenta.id ? { ...c, autoSync: !c.autoSync } : c));
    } catch (e: any) {
      toast.error(e.message || 'No se pudo actualizar el álbum');
    }
  };

  /* ── iCloud: desconectar un álbum guardado (no borra fotos ya importadas) ── */
  const handleDesconectarICloud = async (cuenta: CuentaICloud) => {
    setDesconectandoICloud(cuenta.id);
    try {
      const idToken = await getToken();
      await desconectarAlbumICloud(cuenta.id, idToken);
      setCuentasICloud(prev => prev.filter(c => c.id !== cuenta.id));
      toast.success(`Álbum "${cuenta.nombre}" desconectado`);
    } catch (e: any) {
      toast.error(e.message || 'No se pudo desconectar el álbum');
    } finally {
      setDesconectandoICloud('');
    }
  };

  /* ── 3a. Subir a Cloudinary (independiente de la IA — deja las fotos listas para guardar,
     con la categoría que tengan en ese momento, sea 'General' por defecto o ya editada a mano) ── */
  const handleSubirFotos = async () => {
    const pendientes = filas.filter(f => f.incluida && f.estado === 'pendiente');
    if (pendientes.length === 0) return;

    setProgreso({ hecho: 0, total: pendientes.length });
    const idToken = await getToken();

    // 1) Subir todas a Cloudinary primero (esto sí puede ir con más concurrencia)
    const subidas: { fila: FilaFoto; cloudinaryUrl: string }[] = [];

    const pendientesGoogle = pendientes.filter(f => f.origen === 'google');
    const pendientesICloud = pendientes.filter(f => f.origen === 'icloud');

    await runWithConcurrency(pendientesGoogle, CONCURRENCIA, async (fila) => {
      actualizarFila(fila.id, { estado: 'procesando' });
      try {
        const blob = await fetchMediaBlob(fila.mediaItem!.mediaFile.baseUrl, googleTokenRef.current, '=d');
        const cloudinaryUrl = await uploadBlobToCloudinary(blob, fila.mediaItem!.mediaFile.filename, idToken);
        subidas.push({ fila, cloudinaryUrl });
      } catch (e: any) {
        actualizarFila(fila.id, { estado: 'error', error: e.message || 'Error subiendo esta foto' });
        setProgreso(p => ({ ...p, hecho: p.hecho + 1 }));
      }
    });

    // iCloud: el servidor descarga de Apple y sube a Cloudinary en un solo paso
    // (evita el mismo problema de CORS que ya resolvimos en el cropper — el
    // CDN de Apple no promete cabeceras CORS para que el navegador lo lea).
    if (pendientesICloud.length > 0) {
      pendientesICloud.forEach(fila => actualizarFila(fila.id, { estado: 'procesando' }));
      try {
        const resultados = await importarDeICloud(
          pendientesICloud.map(f => ({
            id: f.id,
            fullUrl: f.icloudItem!.fullUrl,
            filename: f.icloudItem!.filename,
            tipo: f.icloudItem!.tipo,
          })),
          idToken,
        );
        const porId = new Map(resultados.map(r => [r.id, r]));
        for (const fila of pendientesICloud) {
          const r = porId.get(fila.id);
          if (r?.cloudinaryUrl) {
            subidas.push({ fila, cloudinaryUrl: r.cloudinaryUrl });
          } else {
            actualizarFila(fila.id, { estado: 'error', error: r?.error || 'Error subiendo esta foto' });
            setProgreso(p => ({ ...p, hecho: p.hecho + 1 }));
          }
        }
      } catch (e: any) {
        for (const fila of pendientesICloud) {
          actualizarFila(fila.id, { estado: 'error', error: e.message || 'Error importando desde iCloud' });
          setProgreso(p => ({ ...p, hecho: p.hecho + 1 }));
        }
      }
    }

    // 2) Ya subidas: quedan "listas" para guardar de inmediato, sin depender de la IA.
    //    La categoría/subcategoría/descripción que tengan en este momento (por defecto
    //    'General' o lo que el usuario ya haya editado a mano) es la que se usará si
    //    nunca se manda a clasificar con IA.
    for (const s of subidas) {
      actualizarFila(s.fila.id, {
        estado: 'lista',
        cloudinaryUrl: s.cloudinaryUrl,
      });
      setProgreso(p => ({ ...p, hecho: p.hecho + 1 }));
    }

    if (subidas.length > 0) {
      toast.success(`${subidas.length} foto(s) subida(s). Puedes clasificarlas con IA o editar categoría/descripción a mano y guardar.`);
    }
  };

  /* ── 3b. Clasificar con IA (Groq vision, en lotes) las fotos que YA están subidas
     y todavía no pasaron por la IA. Es independiente de la subida y del guardado:
     se puede guardar sin usar esto, y se puede volver a llamar para clasificar
     fotos nuevas que se hayan subido después. ── */
  const handleClasificarConIA = async () => {
    const sinClasificar = filas.filter(f => f.incluida && f.estado === 'lista' && f.cloudinaryUrl && !f.clasificada);
    if (sinClasificar.length === 0) return;

    const idToken = await getToken();
    setProgreso({ hecho: 0, total: sinClasificar.length });

    const lotes = chunk(sinClasificar, LOTE_IA);
    await runWithConcurrency(lotes, LOTES_EN_PARALELO, async (lote) => {
      try {
        const res = await fetch('/api/classify-foto', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fotos: lote.map(f => ({ id: f.id, url: urlParaClasificar(f.cloudinaryUrl!) })),
            eventosConocidos: eventosDetectadosRef.current,
          }),
        });
        if (!res.ok) throw new Error('La IA no pudo clasificar este lote');
        const data = await res.json();
        const resultados: Record<string, any> = {};
        for (const r of data.fotos || []) resultados[r.id] = r;

        for (const f of lote) {
          const r = resultados[f.id];
          if (!r) {
            actualizarFila(f.id, { error: 'La IA no devolvió resultado para esta foto' });
            continue;
          }
          if (r.nombreGrupo && !eventosDetectadosRef.current.includes(r.nombreGrupo)) {
            eventosDetectadosRef.current = [...eventosDetectadosRef.current, r.nombreGrupo];
            // Si ya existe un álbum con (casi) el mismo título, lo vinculamos
            // de una vez — así no se crea un álbum duplicado por accidente.
            const match = albumesExistentes.find(
              a => a.titulo.trim().toLowerCase() === r.nombreGrupo.trim().toLowerCase()
            );
            if (match) {
              setGrupoAlbumId(prev => ({ ...prev, [r.nombreGrupo]: match.id }));
            }
          }
          actualizarFila(f.id, {
            categoria: r.categoria,
            subcategoria: r.subcategoria,
            alt: r.alt,
            calidad: r.calidad,
            motivoCalidad: r.motivoCalidad,
            eventoNombre: r.nombreGrupo || '',
            incluida: r.calidad !== 'mala', // auto-descarta las de mala calidad, editable después
            clasificada: true,
          });
        }
      } catch (e: any) {
        for (const f of lote) {
          actualizarFila(f.id, { error: e.message || 'Error procesando este lote' });
        }
      } finally {
        setProgreso(p => ({ ...p, hecho: p.hecho + lote.length }));
      }
    });

    toast.success('Clasificación y agrupación por evento terminada. Revisa y ajusta antes de publicar.');
  };

  /* ── 4. Guardar las aprobadas en la galería, creando/vinculando álbumes reales ── */
  const handleGuardarEnGaleria = async () => {
    const aprobadas = filas.filter(f => f.incluida && f.estado === 'lista' && f.cloudinaryUrl);
    if (aprobadas.length === 0) {
      toast.error('No hay fotos listas y seleccionadas para guardar');
      return;
    }
    setFase('guardando');
    try {
      // 1) Por cada grupo con nombre, resolver su albumId real: el ya
      //    vinculado (grupoAlbumId) o uno nuevo creado en `albums` ahora mismo.
      const nombresDeEvento = [...new Set(aprobadas.map(f => f.eventoNombre.trim()).filter(Boolean))];
      const albumIdPorNombre: Record<string, string> = {};

      for (const nombre of nombresDeEvento) {
        const yaVinculado = grupoAlbumId[nombre];
        if (yaVinculado) { albumIdPorNombre[nombre] = yaVinculado; continue; }

        const primeraFoto = aprobadas.find(f => f.eventoNombre.trim() === nombre);
        const ref = await addDoc(collection(db, COL.ALBUMES), {
          titulo: nombre,
          slug: slugify(nombre),
          tipoEvento: '', cliente: '', fecha: new Date().toISOString().slice(0, 10), descripcion: '',
          coverUrl: primeraFoto?.cloudinaryUrl || '', coverFocalX: 0.5, coverFocalY: 0.5,
          visible: true, order: albumesExistentes.length + 1, createdAt: new Date().toISOString(),
        });
        albumIdPorNombre[nombre] = ref.id;
      }

      // 2) Guardar cada foto en gallery_items con su albumId ya resuelto
      //    (mismo esquema que el formulario manual de /dashboard/galeria).
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
          albumId: eventoNombre ? (albumIdPorNombre[eventoNombre] || '') : '',
          focalX: 0.5,
          focalY: 0.5,
          tipo: f.tipo,
          visible: true,
          order,
          row: 1,
          createdAt: new Date().toISOString(),
        });
      }

      toast.success(`✅ ${aprobadas.length} foto(s) agregadas a la galería`);
      setFilas(prev => prev.filter(f => !aprobadas.includes(f)));
      setGrupoAlbumId({});
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
    // Si el grupo viejo ya estaba vinculado a un álbum real y el nuevo nombre
    // todavía no tiene vínculo propio, conservamos ese vínculo.
    setGrupoAlbumId(prev => {
      if (!prev[nombreViejo] || prev[nombreNuevo]) return prev;
      const next = { ...prev, [nombreNuevo]: prev[nombreViejo] };
      delete next[nombreViejo];
      return next;
    });
  };

  const totalIncluidas = filas.filter(f => f.incluida).length;
  const totalListas = filas.filter(f => f.estado === 'lista').length;
  const totalPendientes = filas.filter(f => f.incluida && f.estado === 'pendiente').length;
  const totalSinClasificar = filas.filter(f => f.incluida && f.estado === 'lista' && f.cloudinaryUrl && !f.clasificada).length;

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
        Importar fotos
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 24 }}>
        Trae fotos desde Google Photos o desde un álbum compartido de iCloud, súbelas, y luego —si quieres— pide a la IA que las clasifique por categoría, calidad y las agrupe por evento. Clasificar con IA es opcional: también puedes elegir la categoría a mano y guardar directamente.
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
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {([
            { k: 'google', label: '📷 Google Photos' },
            { k: 'icloud', label: '☁️ Álbum de iCloud' },
          ] as { k: Fuente; label: string }[]).map(({ k, label }) => (
            <button key={k} onClick={() => setFuente(k)} type="button" style={{
              padding: '0.5rem 1rem', borderRadius: 10,
              border: fuente === k ? '1.5px solid #1e3a5f' : '1.5px solid #e2e8f0',
              background: fuente === k ? '#eff6ff' : '#fff',
              color: fuente === k ? '#1e3a5f' : '#64748b',
              fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {fase === 'idle' && fuente === 'google' && (
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

      {fase === 'idle' && fuente === 'icloud' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560 }}>
          {cargandoICloud ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: '0.85rem' }}>
              <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              Revisando álbumes de iCloud conectados...
            </div>
          ) : (
            <>
              {cuentasICloud.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', margin: 0 }}>
                    Álbumes conectados — no piden pegar el link de nuevo, y se sincronizan solos
                  </p>
                  {cuentasICloud.map(c => (
                    <div key={c.id} style={{
                      display: 'flex', flexDirection: 'column', gap: 6, background: '#f8fafc',
                      border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.7rem 0.9rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ flex: 1, fontSize: '0.85rem', color: '#0a1628', fontWeight: 700 }}>
                          ☁️ {c.nombre}
                        </span>
                        <button onClick={() => handleUsarAlbumICloud(c)} style={{
                          display: 'flex', alignItems: 'center', gap: 6, background: '#1e3a5f', color: '#fff',
                          border: 'none', borderRadius: 8, padding: '0.5rem 0.9rem', fontWeight: 700,
                          fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>
                          <ImagePlus size={14} /> Abrir
                        </button>
                        <button onClick={() => handleSincronizarICloud(c.id)} disabled={sincronizando !== ''}
                          title="Trae ahora mismo solo las fotos nuevas desde la última vez, las clasifica con IA y las deja pendientes de aprobar en Galería"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
                            background: 'transparent', border: '1px solid #d4a017', borderRadius: 8, color: '#b45309',
                            cursor: sincronizando !== '' ? 'not-allowed' : 'pointer', flexShrink: 0,
                          }}>
                          {sincronizando === c.id
                            ? <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                            : <Sparkles size={14} />}
                        </button>
                        <button onClick={() => handleDesconectarICloud(c)} disabled={desconectandoICloud === c.id}
                          title="Desconectar este álbum"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
                            background: 'transparent', border: '1px solid #fecaca', borderRadius: 8, color: '#ef4444',
                            cursor: desconectandoICloud === c.id ? 'not-allowed' : 'pointer', flexShrink: 0,
                          }}>
                          {desconectandoICloud === c.id
                            ? <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                            : <LogOut size={14} />}
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: '0.7rem', color: '#94a3b8' }}>
                        <span>{c.fotosVistas} foto(s) vista(s)</span>
                        <span>·</span>
                        <span>{c.lastSyncedAt ? `Última sincronización: ${new Date(c.lastSyncedAt).toLocaleString('es-PE')}` : 'Nunca sincronizado'}</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginLeft: 'auto' }}>
                          <input type="checkbox" checked={c.autoSync} onChange={() => handleAlternarAutoSyncICloud(c)} />
                          Auto-importar fotos nuevas
                        </label>
                      </div>
                      {c.lastSyncError && (
                        <p style={{ fontSize: '0.7rem', color: '#ef4444', margin: 0 }}>⚠️ {c.lastSyncError}</p>
                      )}
                    </div>
                  ))}
                  <button onClick={() => handleSincronizarICloud()} disabled={sincronizando !== ''} type="button" style={{
                    display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                    background: 'transparent', border: '1px solid #d4a017', color: '#b45309',
                    borderRadius: 8, padding: '0.4rem 0.8rem', fontWeight: 700,
                    fontSize: '0.75rem', cursor: sincronizando !== '' ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  }}>
                    <Sparkles size={13} /> {sincronizando === 'all' ? 'Sincronizando...' : 'Sincronizar todos ahora'}
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: cuentasICloud.length > 0 ? '1px solid #e2e8f0' : 'none', paddingTop: cuentasICloud.length > 0 ? 14 : 0 }}>
                <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                  {cuentasICloud.length > 0 ? 'Conectar otro álbum: ' : ''}
                  En tu iPhone: <strong>Fotos → selecciona las fotos del evento → Compartir → Álbum compartido</strong> (o
                  agrégalas a uno existente) → en el álbum, activa <strong>"Sitio web público"</strong> → copia el link y pégalo aquí.
                </p>
                <input
                  value={icloudNombre}
                  onChange={e => setIcloudNombre(e.target.value)}
                  placeholder="Nombre del álbum/evento (ej. Quinceañero Valentina)"
                  style={{
                    padding: '0.65rem 0.9rem', borderRadius: 10, border: '1.5px solid #e2e8f0',
                    fontSize: '0.85rem', fontFamily: 'inherit',
                  }}
                />
                <input
                  value={icloudUrl}
                  onChange={e => setIcloudUrl(e.target.value)}
                  placeholder="https://www.icloud.com/sharedalbum/#B..."
                  style={{
                    padding: '0.65rem 0.9rem', borderRadius: 10, border: '1.5px solid #e2e8f0',
                    fontSize: '0.85rem', fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleConectarICloud} disabled={!icloudUrl.trim() || conectandoICloud} type="button" style={{
                    display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
                    background: icloudUrl.trim() ? '#1e3a5f' : '#e2e8f0',
                    color: icloudUrl.trim() ? '#fff' : '#94a3b8',
                    border: 'none', borderRadius: 12, padding: '0.85rem 1.5rem', fontWeight: 700,
                    fontSize: '0.9rem', cursor: (icloudUrl.trim() && !conectandoICloud) ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                  }}>
                    {conectandoICloud
                      ? <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                      : <ImagePlus size={18} />}
                    Conectar y guardar álbum
                  </button>
                </div>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
                  No pide iniciar sesión ni contraseña — funciona con cualquier álbum compartido públicamente.
                  Queda guardado hasta que le des "Desconectar", y las fotos nuevas que agregues a ese álbum se auto-importan solas
                  (clasificadas por IA, pendientes de tu aprobación en Galería) sin que tengas que volver a abrir esta pantalla.
                </p>
              </div>
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
            <button onClick={handleSubirFotos} disabled={totalPendientes === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: totalPendientes === 0 ? '#e2e8f0' : '#1e3a5f',
                color: totalPendientes === 0 ? '#94a3b8' : '#fff',
                border: 'none', borderRadius: 10, padding: '0.7rem 1.25rem',
                fontWeight: 700, fontSize: '0.85rem',
                cursor: totalPendientes === 0 ? 'not-allowed' : 'pointer',
              }}>
              <ImagePlus size={16} />
              {progreso.total > 0 && progreso.hecho < progreso.total && totalSinClasificar === 0
                ? `Subiendo... ${progreso.hecho}/${progreso.total}`
                : `Subir fotos (${totalPendientes})`}
            </button>

            <button onClick={handleClasificarConIA} disabled={totalSinClasificar === 0}
              title="Clasifica por categoría/subcategoría, agrupa por evento y redacta la descripción de cada foto ya subida. No es obligatorio: puedes editar la categoría a mano y guardar directamente."
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: totalSinClasificar === 0 ? '#e2e8f0' : '#d4a017',
                color: totalSinClasificar === 0 ? '#94a3b8' : '#0a1628',
                border: 'none', borderRadius: 10, padding: '0.7rem 1.25rem',
                fontWeight: 700, fontSize: '0.85rem',
                cursor: totalSinClasificar === 0 ? 'not-allowed' : 'pointer',
              }}>
              <Sparkles size={16} />
              {progreso.total > 0 && progreso.hecho < progreso.total && totalSinClasificar > 0
                ? `Clasificando y agrupando... ${progreso.hecho}/${progreso.total}`
                : `Clasificar con IA (${totalSinClasificar})`}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
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

              {/* Vínculo a álbum real — igual que en Galería y /dashboard/albumes.
                  Solo aplica a grupos con nombre; "Sin evento asignado" se guarda suelto. */}
              {grupo.nombre && (
                <div style={{ marginBottom: 10, marginLeft: 18 }}>
                  <select
                    value={grupoAlbumId[grupo.nombre] || ''}
                    onChange={e => setGrupoAlbumId(prev => ({ ...prev, [grupo.nombre]: e.target.value }))}
                    style={{ fontSize: '0.75rem', padding: '5px 8px', borderRadius: 7, border: '1px solid #e2e8f0', color: '#334155' }}>
                    <option value="">📁 Crear álbum nuevo: "{grupo.nombre}"</option>
                    {albumesExistentes.map(a => (
                      <option key={a.id} value={a.id}>🔗 Agregar al álbum existente: {a.titulo}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
                {grupo.filas.map(f => (
                  <div key={f.id} style={{
                    border: `1.5px solid ${f.calidad === 'mala' ? '#fecaca' : (grupo.nombre ? colorDeGrupo(grupo.nombre) + '55' : '#e2e8f0')}`,
                    borderRadius: 14, overflow: 'hidden', background: '#fff',
                    opacity: f.incluida ? 1 : 0.5,
                  }}>
                    <div style={{ position: 'relative', aspectRatio: '4/3', background: '#e2e8f0' }}>
                      <img src={f.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {f.tipo === 'video' && (
                        <div style={{
                          position: 'absolute', top: 6, left: 6, display: 'flex', alignItems: 'center', gap: 4,
                          background: 'rgba(10,22,40,.75)', color: '#fff', borderRadius: 8,
                          padding: '3px 7px', fontSize: '0.65rem', fontWeight: 700,
                        }}>
                          <Video size={12} /> Video
                        </div>
                      )}
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
