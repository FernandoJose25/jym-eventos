import { SUBCATS, CATEGORIAS, CATEGORIA_DESCRIPCIONES } from '@/lib/galeriaTaxonomy';

/** Server-only. Compartido por /api/classify-foto (uso manual desde el importador)
 *  y /api/cron/icloud-sync (clasificación automática de fotos nuevas). */

const MAX_FOTOS_POR_LOTE = 4;

export interface FotoClasificada {
    id: string;
    categoria: string;
    subcategoria: string;
    alt: string;
    calidad: 'buena' | 'regular' | 'mala';
    motivoCalidad: string;
    nombreGrupo: string;
}

const buildPrompt = (n: number, eventosConocidos: string[]) => `Eres un experto clasificador y curador de fotos para la galería web de J&M Decoraciones y Eventos, una empresa peruana de eventos y decoración de Sechura, Piura. Tu criterio debe ser tan preciso e intuitivo como el de un editor humano que conoce bien el negocio: no clasifiques solo por palabras sueltas, mira la escena completa (personas, decoración, equipo presente, momento del evento) antes de decidir.

Vas a recibir ${n} fotos en ESTE MISMO mensaje, en orden (foto de índice 0, 1, 2...). Tienes dos tareas, igual de importantes:

1) AGRUPAR: detectar cuáles de estas fotos pertenecen AL MISMO EVENTO (misma sesión: mismo lugar, misma decoración, mismos invitados/vestuario, mismo momento) para agruparlas, en vez de tratarlas como cosas separadas.
2) CLASIFICAR cada foto dentro de la taxonomía real de la web (abajo). Sé consistente: si dos fotos son claramente del mismo evento y del mismo tipo de contenido, deben terminar con la MISMA categoría (y misma subcategoría si aplica), aunque cada una tenga su propia descripción individual.

Estas son las ÚNICAS categorías y subcategorías que existen en la web — no inventes otras, y si una foto podría encajar en más de una, elige la que describe mejor el elemento PROTAGONISTA de la imagen:

${CATEGORIAS.map(c => `- "${c}" — ${CATEGORIA_DESCRIPCIONES[c] || ''}\n  Subcategorías: [${(SUBCATS[c] || []).map(s => `"${s}"`).join(', ') || 'ninguna, esta categoría no lleva subcategoría'}]`).join('\n')}

Reglas para decidir mejor:
- Si hay niños siendo animados por un personaje o mascota disfrazada → "Shows Infantiles", no "General".
- Si hay humo, luces de colores, máscaras o percusión animando adultos → "Show Hora Loca".
- Si el logo de una empresa, stand corporativo o ambiente de oficina/feria es visible → "Activaciones Empresariales".
- Si el foco de la foto es la escenografía/backdrop/centros de mesa sin gente en primer plano → "Decoración Temática".
- Si se ve equipo de filmación (cámara de cine, drone/dron, gimbal, luces de video) → "Filmación y Fotografía"; si es solo una cámara fotográfica o un retrato posado → "Fotografía".
- Si se ve comida servida, buffet o mesa de platos → "Catering"; si es un carrito de dulces/snacks o candy bar → "Catering y Carritos Snacks".
- Usa "General" solo cuando de verdad ninguna otra categoría describe bien la foto.

${eventosConocidos.length > 0 ? `Estos son nombres de evento YA detectados en fotos anteriores de esta misma sesión de importación:
${eventosConocidos.map(e => `- "${e}"`).join('\n')}
Si alguna de las fotos de ahora pertenece a uno de esos mismos eventos, usa EXACTAMENTE ese mismo texto en "nombreGrupo" (cópialo tal cual, sin cambiar nada). Solo crea un nombre nuevo si de verdad es un evento distinto.` : ''}

RESPONDE ÚNICAMENTE con este JSON, sin markdown ni texto extra:
{
  "fotos": [
    {
      "indice": 0,
      "categoria": "una de las categorías de la lista de arriba, EXACTAMENTE igual (mismas mayúsculas y tildes)",
      "subcategoria": "una subcategoría válida para esa categoría exacta, o cadena vacía si esa categoría no tiene subcategorías",
      "alt": "descripción corta, natural y ESPECÍFICA de ESTA foto en español (6 a 12 palabras) — distinta para cada foto aunque compartan categoría y evento",
      "calidad": "buena, regular o mala según nitidez/encuadre/iluminación",
      "motivoCalidad": "razón breve si la calidad no es buena, o cadena vacía si es buena",
      "nombreGrupo": "nombre corto del evento al que pertenece esta foto, ej. 'Quinceañero - Show Hora Loca' o 'Boda - Decoración Elegante'. Usa el MISMO texto exacto para todas las fotos que creas que son del mismo evento."
    }
  ]
}
El array "fotos" debe tener exactamente ${n} elementos, uno por cada foto recibida, en el mismo orden.`;

/** Clasifica UN lote (máx 4) de fotos ya subidas (URLs públicas) con Groq vision. */
export async function clasificarLoteConIA(
    fotos: { id: string; url: string }[],
    eventosConocidos: string[] = [],
): Promise<FotoClasificada[]> {
    if (fotos.length === 0) return [];
    if (fotos.length > MAX_FOTOS_POR_LOTE) {
        throw new Error(`Máximo ${MAX_FOTOS_POR_LOTE} fotos por lote`);
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) throw new Error('API key de Groq no configurada');

    const conocidos = eventosConocidos.filter(e => typeof e === 'string' && e.trim().length > 0).slice(0, 20);

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: buildPrompt(fotos.length, conocidos) },
                        ...fotos.map(f => ({ type: 'image_url', image_url: { url: f.url } })),
                    ],
                },
            ],
            temperature: 0.15,
            max_completion_tokens: 350 * fotos.length + 200,
            response_format: { type: 'json_object' },
        }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    const items = Array.isArray(parsed.fotos) ? parsed.fotos : [];

    // Nunca confiar ciegamente en el modelo: validar contra la taxonomía real,
    // y devolver un resultado por cada foto enviada aunque el modelo falle en alguna.
    return fotos.map((f, i) => {
        const item = items.find((x: any) => x?.indice === i) || items[i] || {};
        const categoria = CATEGORIAS.includes(item.categoria) ? item.categoria : 'General';
        const subsValidas = SUBCATS[categoria] || [];
        const subcategoria = subsValidas.includes(item.subcategoria) ? item.subcategoria : '';
        const nombreGrupo = typeof item.nombreGrupo === 'string' ? item.nombreGrupo.trim().slice(0, 80) : '';

        return {
            id: f.id,
            categoria,
            subcategoria,
            alt: typeof item.alt === 'string' ? item.alt : '',
            calidad: (['buena', 'regular', 'mala'].includes(item.calidad) ? item.calidad : 'buena') as FotoClasificada['calidad'],
            motivoCalidad: typeof item.motivoCalidad === 'string' ? item.motivoCalidad : '',
            nombreGrupo: nombreGrupo || (subcategoria || categoria),
        };
    });
}

/** Clasifica varias fotos en lotes de a 4, respetando el mismo agrupamiento de eventos entre lotes. */
export async function clasificarFotosEnLotes(
    fotos: { id: string; url: string }[],
    lotesEnParalelo = 2,
): Promise<Record<string, FotoClasificada>> {
    const resultados: Record<string, FotoClasificada> = {};
    let eventosDetectados: string[] = [];

    const lotes: { id: string; url: string }[][] = [];
    for (let i = 0; i < fotos.length; i += MAX_FOTOS_POR_LOTE) lotes.push(fotos.slice(i, i + MAX_FOTOS_POR_LOTE));

    let idx = 0;
    const runners = new Array(Math.min(lotesEnParalelo, lotes.length)).fill(0).map(async () => {
        while (idx < lotes.length) {
            const lote = lotes[idx++];
            try {
                const clasificadas = await clasificarLoteConIA(lote, eventosDetectados);
                for (const c of clasificadas) {
                    resultados[c.id] = c;
                    if (c.nombreGrupo && !eventosDetectados.includes(c.nombreGrupo)) {
                        eventosDetectados = [...eventosDetectados, c.nombreGrupo];
                    }
                }
            } catch (e) {
                console.error('[classifyFotosIA] error en lote', e);
            }
        }
    });
    await Promise.all(runners);
    return resultados;
}
