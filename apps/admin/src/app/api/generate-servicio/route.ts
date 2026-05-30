import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';

const PROMPT = (nombre: string, instrucciones?: string) => `Eres copywriter especializado en empresas de eventos y decoraciones peruanas.
Escribe para J&M Eventos y Decoraciones de Sechura, Piura.
Tono: emotivo, cálido, familiar. Español peruano natural.
RESPONDE ÚNICAMENTE con JSON válido, sin markdown ni texto extra.
${instrucciones ? `\nInstrucciones adicionales del cliente:\n${instrucciones}\n` : ''}
Genera contenido completo para el servicio: "${nombre}"

Responde SOLO con este JSON:
{
  "eyebrow": "texto pequeño tipo Celebraciones Especiales",
  "h1": "título con <em>palabra clave</em> en cursiva",
  "descripcion": "2 oraciones para el hero",
  "detalleH2": "título H2 de la sección detalle",
  "parrafo1": "párrafo 1 (2-3 oraciones)",
  "parrafo2": "párrafo 2 (1-2 oraciones)",
  "caracteristicas": [
    {"texto": "nombre característica", "detalle": "descripción"},
    {"texto": "...", "detalle": "..."},
    {"texto": "...", "detalle": "..."},
    {"texto": "...", "detalle": "..."}
  ],
  "cards": [
    {"icono": "🎭", "titulo": "nombre", "descripcion": "1 oración"},
    {"icono": "📸", "titulo": "nombre", "descripcion": "1 oración"},
    {"icono": "🎂", "titulo": "nombre", "descripcion": "1 oración"},
    {"icono": "🎪", "titulo": "nombre", "descripcion": "1 oración"},
    {"icono": "🌸", "titulo": "nombre", "descripcion": "1 oración"},
    {"icono": "✨", "titulo": "nombre", "descripcion": "1 oración"}
  ],
  "ctaH2": "título del CTA final",
  "ctaDescripcion": "1 oración motivadora",
  "seoDescripcion": "meta descripción para Google (max 155 chars)"
}`;

export async function POST(req: NextRequest) {
  const auth = await verifyToken(req);
  if (auth.response) return auth.response;

  const { nombre, instrucciones } = await req.json();
  if (!nombre) return NextResponse.json({ error:'nombre requerido' }, { status:400 });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return NextResponse.json({ error:'API key no configurada' }, { status:500 });

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: PROMPT(nombre, instrucciones) }],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    return NextResponse.json(JSON.parse(clean));
  } catch(e) {
    console.error('[generate-servicio]', e);
    return NextResponse.json({ error:'Error generando contenido' }, { status:500 });
  }
}
