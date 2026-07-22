import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { calcularSignals, type Signals } from '@/lib/sugerenciasSignals';

/**
 * Devuelve sugerencias accionables para el panel del botón 🔔. Combina reglas
 * (calcularSignals sobre Firestore) con una redacción/priorización hecha por
 * Groq. Si la IA falla o no hay API key, cae a sugerencias derivadas de las
 * reglas — el panel nunca queda vacío por un problema del modelo.
 */

export interface Sugerencia {
  titulo: string;
  detalle: string;
  prioridad: 'alta' | 'media' | 'baja';
  href?: string;
}

// Mapa señal → dónde ir en el admin. La IA solo redacta; el enlace lo ponemos
// nosotros para que siempre apunte a una ruta real.
const HREFS = {
  mensajes: '/dashboard/mensajes',
  galeria: '/dashboard/galeria',
  testimonios: '/dashboard/configuracion?s=testimonios',
  faq: '/dashboard/configuracion?s=faq',
} as const;

/** Sugerencias deterministas como respaldo (y como base para la IA). */
function reglasBase(s: Signals): Sugerencia[] {
  const out: Sugerencia[] = [];
  if (s.mensajesSinResponderHace48h > 0) {
    out.push({
      titulo: `${s.mensajesSinResponderHace48h} mensaje(s) sin responder hace +48h`,
      detalle: 'Hay clientes esperando respuesta desde hace más de dos días. Responder rápido mejora la tasa de cierre.',
      prioridad: 'alta', href: HREFS.mensajes,
    });
  } else if (s.mensajesSinLeer > 0) {
    out.push({
      titulo: `${s.mensajesSinLeer} mensaje(s) sin leer`,
      detalle: 'Tienes mensajes nuevos de clientes en la bandeja.',
      prioridad: 'media', href: HREFS.mensajes,
    });
  }
  if (s.fotosSinCategoria > 0) {
    out.push({
      titulo: `${s.fotosSinCategoria} foto(s) sin categoría`,
      detalle: 'Las fotos sin categoría no alimentan las "Historias" de la web. Clasifícalas para que la sección se vea completa.',
      prioridad: s.fotosSinCategoria > 5 ? 'media' : 'baja', href: HREFS.galeria,
    });
  }
  if (s.diasDesdeUltimaFoto !== null && s.diasDesdeUltimaFoto >= 21) {
    out.push({
      titulo: `Sin fotos nuevas hace ${s.diasDesdeUltimaFoto} días`,
      detalle: 'Subir trabajos recientes mantiene la galería fresca y da confianza a los clientes.',
      prioridad: 'baja', href: HREFS.galeria,
    });
  }
  if (s.serviciosSinTestimonios.length > 0) {
    out.push({
      titulo: `${s.serviciosSinTestimonios.length} servicio(s) sin testimonios`,
      detalle: `Sin reseñas: ${s.serviciosSinTestimonios.slice(0, 3).join(', ')}${s.serviciosSinTestimonios.length > 3 ? '…' : ''}. Los testimonios aumentan la conversión.`,
      prioridad: 'baja', href: HREFS.testimonios,
    });
  }
  if (!s.faqPersonalizada) {
    out.push({
      titulo: 'La FAQ de la web usa el texto por defecto',
      detalle: 'Aún no personalizas las preguntas frecuentes. Ajústalas a tu negocio real.',
      prioridad: 'baja', href: HREFS.faq,
    });
  }
  return out;
}

const PROMPT = `Eres el asistente del panel de administración de "J&M Decoraciones y Eventos", un negocio de eventos en Sechura, Piura (Perú). Recibes SEÑALES objetivas del estado del negocio y una lista de sugerencias base ya redactadas. Tu tarea: devolver las sugerencias más útiles para el dueño, reescritas en español peruano cercano y motivador (trato de "tú"), ordenadas por prioridad (primero lo urgente). No inventes datos que no estén en las señales. Máximo 5 sugerencias.

Responde SOLO un JSON con esta forma:
{"sugerencias":[{"titulo":"...","detalle":"...","prioridad":"alta|media|baja","clave":"mensajes|galeria|testimonios|faq"}]}
El campo "clave" debe indicar a qué área pertenece cada sugerencia.`;

const CLAVE_HREF: Record<string, string> = {
  mensajes: HREFS.mensajes, galeria: HREFS.galeria,
  testimonios: HREFS.testimonios, faq: HREFS.faq,
};

export async function POST(req: NextRequest) {
  const auth = await verifyToken(req);
  if (auth.response) return auth.response;

  let signals: Signals;
  try {
    signals = await calcularSignals();
  } catch (e: any) {
    console.error('[sugerencias] signals', e);
    return NextResponse.json({ error: 'No se pudieron calcular las señales' }, { status: 500 });
  }

  const base = reglasBase(signals);

  // Sin nada que sugerir: devolver lista vacía (el panel muestra "todo al día").
  if (base.length === 0) {
    return NextResponse.json({ sugerencias: [], signals, fuente: 'reglas' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    // Sin IA disponible: devolvemos las reglas tal cual.
    return NextResponse.json({ sugerencias: base, signals, fuente: 'reglas' });
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: JSON.stringify({ signals, sugerenciasBase: base }) },
        ],
        temperature: 0.4,
        max_completion_tokens: 900,
        reasoning_effort: 'none',
        response_format: { type: 'json_object' },
      }),
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    const arr = Array.isArray(parsed.sugerencias) ? parsed.sugerencias : [];

    const sugerencias: Sugerencia[] = arr.slice(0, 5).map((x: any) => ({
      titulo: String(x.titulo || '').slice(0, 120),
      detalle: String(x.detalle || '').slice(0, 300),
      prioridad: ['alta', 'media', 'baja'].includes(x.prioridad) ? x.prioridad : 'media',
      href: CLAVE_HREF[x.clave] || undefined,
    })).filter((x: Sugerencia) => x.titulo);

    // Si la IA devolvió basura, caemos a las reglas.
    if (sugerencias.length === 0) {
      return NextResponse.json({ sugerencias: base, signals, fuente: 'reglas' });
    }
    return NextResponse.json({ sugerencias, signals, fuente: 'ia' });
  } catch (e: any) {
    console.error('[sugerencias] IA', e);
    return NextResponse.json({ sugerencias: base, signals, fuente: 'reglas' });
  }
}
