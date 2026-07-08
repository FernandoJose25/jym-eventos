import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { SUBCATS, CATEGORIAS } from '@/lib/galeriaTaxonomy';

const buildPrompt = () => `Eres un clasificador de fotos para la galería web de J&M Decoraciones y Eventos, una empresa peruana de eventos y decoración de Sechura, Piura.

Analiza la imagen y clasifícala ÚNICAMENTE dentro de estas categorías y subcategorías (no inventes otras, son las únicas que existen en la web):

${CATEGORIAS.map(c => `- "${c}": [${(SUBCATS[c] || []).map(s => `"${s}"`).join(', ') || 'sin subcategorías'}]`).join('\n')}

RESPONDE ÚNICAMENTE con este JSON, sin markdown ni texto extra:
{
  "categoria": "una de las categorías de la lista de arriba",
  "subcategoria": "una subcategoría válida para esa categoría exacta, o cadena vacía si esa categoría no tiene subcategorías",
  "alt": "descripción corta y natural de la foto en español, 6 a 10 palabras",
  "calidad": "buena, regular o mala segun nitidez/encuadre/iluminación",
  "motivoCalidad": "razón breve si la calidad no es buena, o cadena vacía si es buena"
}`;

export async function POST(req: NextRequest) {
    const auth = await verifyToken(req);
    if (auth.response) return auth.response;

    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'url requerida' }, { status: 400 });

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) return NextResponse.json({ error: 'API key de Groq no configurada' }, { status: 500 });

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
                            { type: 'text', text: buildPrompt() },
                            { type: 'image_url', image_url: { url } },
                        ],
                    },
                ],
                temperature: 0.3,
                max_completion_tokens: 400,
                response_format: { type: 'json_object' },
            }),
        });

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '{}';
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);

        // Nunca confiar ciegamente en el modelo: validar contra la taxonomía real.
        const categoria = CATEGORIAS.includes(parsed.categoria) ? parsed.categoria : 'General';
        const subsValidas = SUBCATS[categoria] || [];
        const subcategoria = subsValidas.includes(parsed.subcategoria) ? parsed.subcategoria : '';

        return NextResponse.json({
            categoria,
            subcategoria,
            alt: typeof parsed.alt === 'string' ? parsed.alt : '',
            calidad: ['buena', 'regular', 'mala'].includes(parsed.calidad) ? parsed.calidad : 'buena',
            motivoCalidad: typeof parsed.motivoCalidad === 'string' ? parsed.motivoCalidad : '',
        });
    } catch (e) {
        console.error('[classify-foto]', e);
        return NextResponse.json({ error: 'Error clasificando la imagen' }, { status: 500 });
    }
}