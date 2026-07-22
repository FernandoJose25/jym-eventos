import { adminDb } from './firebase-admin';

/**
 * Server-only. Calcula "señales" objetivas sobre el estado del negocio leyendo
 * Firestore con el SDK admin. Son hechos crudos (números, fechas); la redacción
 * en lenguaje natural y la priorización las hace la IA en /api/sugerencias a
 * partir de estas señales. Mantener esto como reglas puras y baratas: nada de
 * IA aquí, solo consultas.
 */

export interface Signals {
  mensajesSinLeer: number;
  mensajesSinResponderHace48h: number;
  fotosSinCategoria: number;      // categoría 'General' o vacía → frena las Stories
  totalFotosVisibles: number;
  diasDesdeUltimaFoto: number | null;
  serviciosSinTestimonios: string[];
  serviciosOcultos: number;
  faqPersonalizada: boolean;      // ¿ya editaron la FAQ o siguen los defaults?
}

const MS_DIA = 24 * 60 * 60 * 1000;

function toMillis(v: any): number | null {
  if (!v) return null;
  if (typeof v === 'object' && typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v === 'object' && typeof v._seconds === 'number') return v._seconds * 1000;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

export async function calcularSignals(): Promise<Signals> {
  const [mensajesSnap, galeriaSnap, serviciosSnap, testimoniosSnap, faqSnap] =
    await Promise.all([
      adminDb.collection('mensajes').get(),
      adminDb.collection('gallery_items').get(),
      adminDb.collection('services').get(),
      adminDb.collection('testimonials').get(),
      adminDb.collection('site_config').doc('faq').get(),
    ]);

  const ahora = Date.now();

  // ── Mensajes ──
  let mensajesSinLeer = 0;
  let mensajesSinResponderHace48h = 0;
  mensajesSnap.forEach(doc => {
    const m = doc.data();
    if (m.leido === false) mensajesSinLeer++;
    const creado = toMillis(m.createdAt || m.fecha || m.timestamp);
    const respondido = m.estado === 'respondido' || m.respondido === true;
    if (!respondido && creado && ahora - creado > 2 * MS_DIA) mensajesSinResponderHace48h++;
  });

  // ── Galería ──
  let fotosSinCategoria = 0;
  let totalFotosVisibles = 0;
  let ultimaFotoMs: number | null = null;
  galeriaSnap.forEach(doc => {
    const g = doc.data();
    if (g.visible === false) return;
    if (g.tipo === 'video') return;         // las Stories solo usan imágenes
    totalFotosVisibles++;
    const cat = (g.categoria || '').trim();
    if (!cat || cat === 'General') fotosSinCategoria++;
    const creado = toMillis(g.createdAt);
    if (creado && (ultimaFotoMs === null || creado > ultimaFotoMs)) ultimaFotoMs = creado;
  });
  const diasDesdeUltimaFoto = ultimaFotoMs === null ? null : Math.floor((ahora - ultimaFotoMs) / MS_DIA);

  // ── Servicios sin testimonios ──
  const testimoniosPorServicio = new Set<string>();
  testimoniosSnap.forEach(doc => {
    const t = doc.data();
    const ref = t.servicioId || t.serviceId || t.servicio;
    if (ref) testimoniosPorServicio.add(String(ref));
  });
  const serviciosSinTestimonios: string[] = [];
  let serviciosOcultos = 0;
  serviciosSnap.forEach(doc => {
    const s = doc.data();
    if (s.visible === false) { serviciosOcultos++; return; }
    if (!testimoniosPorServicio.has(doc.id)) {
      serviciosSinTestimonios.push(String(s.title || s.nombre || doc.id));
    }
  });

  return {
    mensajesSinLeer,
    mensajesSinResponderHace48h,
    fotosSinCategoria,
    totalFotosVisibles,
    diasDesdeUltimaFoto,
    serviciosSinTestimonios: serviciosSinTestimonios.slice(0, 10),
    serviciosOcultos,
    faqPersonalizada: faqSnap.exists,
  };
}
