import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { SUBCATS, CATEGORIAS } from '@/lib/galeriaTaxonomy';

const MAX_FOTOS_POR_LOTE = 4;

const buildPrompt = (n: number, eventosConocidos: string[]) => `Eres un clasificador de fotos para la galería web de J&M Decoraciones y Eventos, una empresa peruana de eventos y decoración de Sechura, Piura.

Vas a recibir ${n} fotos en ESTE MISMO mensaje, en orden (foto de índice 0, 1, 2...). Además de clasificar cada una, tu tarea más importante es detectar cuáles de estas fotos pertenecen AL MISMO EVENTO (misma sesión: mismo lugar, misma decoración, mismos invitados/vestuario, mismo momento) para agruparlas, en vez de tratarlas como cosas separadas.

Para cada foto, clasifícala ÚNICAMENTE dentro de estas categorías y subcategorías (no inventes otras, son las únicas que existen en la web):

${CATEGORIAS.map(c => `- "${c}": [${(SUBCATS[c] || []).map(s => `"${s}"`).join(', ') || 'sin subcategorías'}]`).join('\n')}

${eventosConocidos.length > 0 ? `Estos son nombres de evento YA detectados en fotos anteriores de esta misma sesión de importación:
${eventosConocidos.map(e => `- "${e}"`).join('\n')}
Si alguna de las fotos de ahora pertenece a uno de esos mismos eventos, usa EXACTAMENTE ese mismo texto en "nombreGrupo" (cópialo tal cual, sin cambiar nada). Solo crea un nombre nuevo si de verdad es un evento distinto.` : ''}

RESPONDE ÚNICAMENTE con este JSON, sin markdown ni texto extra:
{
  "fotos": [
    {
      "indice": 0,
      "categoria": "una de las categorías de la lista de arriba",
      "subcategoria": "una subcategoría válida para esa categoría exacta, o cadena vacía si esa categoría no tiene subcategorías",
      "alt": "descripción corta y natural de la foto en español, 6 a 10 palabras",
      "calidad": "buena, regular o mala segun nitidez/encuadre/iluminación",
      "motivoCalidad": "razón breve si la calidad no es buena, o cadena vacía si es buena",
      "nombreGrupo": "nombre corto del evento al que pertenece esta foto, ej. 'Quinceañero - Show Hora Loca' o 'Boda - Decoración Elegante'. Usa el MISMO texto exacto para todas las fotos que creas que son del mismo evento."
    }
  ]
}
El array "fotos" debe tener exactamente ${n} elementos, uno por cada foto recibida, en el mismo orden.`;

export async function POST(req: NextRequest) {
    const auth = await verifyToken(req);
    if (auth.response) return auth.response;

    const { fotos, eventosConocidos } = await req.json();
    if (!Array.isArray(fotos) || fotos.length === 0) {
        return NextResponse.json({ error: 'fotos (array) requerido' }, { status: 400 });
    }
    if (fotos.length > MAX_FOTOS_POR_LOTE) {
        return NextResponse.json({ error: `Máximo ${MAX_FOTOS_POR_LOTE} fotos por lote` }, { status: 400 });
    }
    for (const f of fotos) {
        if (!f || typeof f.url !== 'string') {
            return NextResponse.json({ error: 'cada foto necesita { id, url }' }, { status: 400 });
        }
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) return NextResponse.json({ error: 'API key de Groq no configurada' }, { status: 500 });

    const conocidos: string[] = Array.isArray(eventosConocidos)
        ? eventosConocidos.filter((e): e is string => typeof e === 'string' && e.trim().length > 0).slice(0, 20)
        : [];

    try {
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
                            ...fotos.map((f: { url: string }) => ({ type: 'image_url', image_url: { url: f.url } })),
                        ],
                    },
                ],
                temperature: 0.3,
                max_completion_tokens: 300 * fotos.length + 200,
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
        const resultados = fotos.map((f: { id: string }, i: number) => {
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
                calidad: ['buena', 'regular', 'mala'].includes(item.calidad) ? item.calidad : 'buena',
                motivoCalidad: typeof item.motivoCalidad === 'string' ? item.motivoCalidad : '',
                nombreGrupo: nombreGrupo || (subcategoria || categoria),
            };
        });

        return NextResponse.json({ fotos: resultados });
    } catch (e) {
        console.error('[classify-foto]', e);
        return NextResponse.json({ error: 'Error clasificando el lote de imágenes' }, { status: 500 });
    }
}