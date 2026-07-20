import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';

/* Claves editables por la IA y su descripción para el prompt.
   Todas viven dentro de detail, excepto "desc" que es la descripción corta del servicio. */
const CAMPOS = {
  desc:               'Descripción corta del servicio (2 oraciones), usada en la cuadrícula de la home',
  eyebrow:            'texto pequeño tipo "Celebraciones Especiales" (no siempre se usa, opcional)',
  hero_desc:          'Descripción héroe / subtítulo de la página de detalle (2 oraciones)',
  categoryLabel:      'Badge de categoría sobre el título, ej. "Celebraciones · Bodas"',
  titleAccentWord:    'Palabra del título que se resalta en cursiva/color',
  longDescH2:         'Título H2 de la sección de detalle',
  longDesc:           'Párrafo principal de la sección de detalle (2-3 oraciones)',
  longDesc2:          'Características, una por línea (texto plano, un ítem por renglón)',
  includes:           'Array de hasta 6 tarjetas "¿Qué incluye?": [{icon, title, desc, visible}]',
  stats:              'Array de estadísticas del hero: [{value, label}], ej. {"value":"+80","label":"Bodas decoradas"}',
  testimonialName:    'Nombre o lugar del cliente en el testimonio flotante del hero',
  testimonialRating:  'Calificación del testimonio, ej. "4.9"',
  testimonialLocation:'Ubicación del testimonio, ej. "Sechura, Piura"',
  ctaH2:              'Título H2 del CTA final de la página',
  ctaP:                'Párrafo del CTA final (1 oración motivadora)',
  btn1Text:           'Texto del botón de cotizar',
} as const;

type CampoKey = keyof typeof CAMPOS;
const CAMPOS_KEYS = Object.keys(CAMPOS) as CampoKey[];

const SYSTEM_PROMPT = `Eres copywriter especializado en empresas de eventos y decoraciones peruanas.
Escribes para J&M Decoraciones y Eventos de Sechura, Piura.
Tono: emotivo, cálido, familiar. Español peruano natural.

Vas a recibir el contenido ACTUAL de la página de un servicio (como JSON, puede tener campos vacíos o ausentes) y una instrucción del usuario.

Tu tarea es decidir, según la instrucción, EXACTAMENTE qué campos crear o modificar — nunca los devuelvas todos por defecto:

- Si el usuario no da ninguna instrucción (instrucción vacía): completa SOLO los campos que están vacíos, ausentes, o con placeholders obviamente genéricos. No toques ni reescribas ningún campo que ya tenga contenido real y específico del servicio.
- Si el usuario pide algo general como "rellena lo que falta" o "completa la página": igual que el caso anterior, solo campos vacíos/faltantes.
- Si el usuario pide "regenera todo" o "reescribe todo": ahí sí puedes devolver y reemplazar todos los campos relevantes.
- Si el usuario pide editar algo específico (ej. "cambia el párrafo principal", "hazlo más corto", "mejora el CTA", "agrega una estadística de bodas"): modifica ÚNICAMENTE el/los campos a los que se refiere esa instrucción, y deja todo lo demás fuera de tu respuesta (no lo incluyas ni vacío ni repetido).

Campos disponibles y su significado (usa EXACTAMENTE estos nombres de clave):
${CAMPOS_KEYS.map(k => `- "${k}": ${CAMPOS[k]}`).join('\n')}

Reglas de formato:
- "includes" y "stats", si los incluyes, deben ser el array COMPLETO ya combinado (si agregas un ítem nuevo a partir de una instrucción puntual, incluye también los ítems existentes que deban conservarse).
- RESPONDE ÚNICAMENTE con JSON válido, sin markdown ni texto extra, con esta forma exacta:
{
  "campos": { /* solo las claves que decidiste crear/modificar, con su valor nuevo */ },
  "resumen": "una frase breve explicando en español qué cambiaste y por qué, para mostrarle al usuario"
}
Si no hay nada que cambiar, responde {"campos": {}, "resumen": "No había nada que completar o modificar."}`;

function limpiarCampos(raw: any): Record<string, any> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, any> = {};
  for (const k of CAMPOS_KEYS) {
    if (!(k in raw)) continue;
    const v = raw[k];
    if (k === 'includes' && Array.isArray(v)) {
      out[k] = v
        .filter(it => it && typeof it === 'object')
        .slice(0, 6)
        .map(it => ({
          icon: typeof it.icon === 'string' ? it.icon : '✅',
          title: typeof it.title === 'string' ? it.title : '',
          desc: typeof it.desc === 'string' ? it.desc : '',
          visible: it.visible !== false,
        }));
    } else if (k === 'stats' && Array.isArray(v)) {
      out[k] = v
        .filter(it => it && typeof it === 'object')
        .map(it => ({
          value: typeof it.value === 'string' ? it.value : '',
          label: typeof it.label === 'string' ? it.label : '',
        }));
    } else if (typeof v === 'string') {
      out[k] = v;
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  const auth = await verifyToken(req);
  if (auth.response) return auth.response;

  const { nombre, instrucciones, contenidoActual } = await req.json();
  if (!nombre) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });

  const userMessage = `Servicio: "${nombre}"

Contenido actual (JSON, campos vacíos o faltantes = sin contenido):
${JSON.stringify(contenidoActual || {}, null, 2)}

Instrucción del usuario: ${instrucciones && instrucciones.trim() ? instrucciones.trim() : '(ninguna — completa solo lo que falte)'}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    const clean = text.replace(/```json|```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: 'La IA devolvió una respuesta inválida. Intenta de nuevo.' }, { status: 502 });
    }

    const campos = limpiarCampos(parsed.campos);
    const resumen = typeof parsed.resumen === 'string' ? parsed.resumen : '';

    return NextResponse.json({ campos, resumen });
  } catch (e) {
    console.error('[generate-servicio]', e);
    return NextResponse.json({ error: 'Error generando contenido' }, { status: 500 });
  }
}
