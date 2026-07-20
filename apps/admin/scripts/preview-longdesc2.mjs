/**
 * Genera una VISTA PREVIA (sin tocar Firestore) del nuevo "longDesc2"
 * (razones/beneficios) de cada servicio, evitando que repita "includes"
 * (desglose del paquete). Usa el modelo de visión de Groq con la imagen
 * real del servicio como contexto, igual que classifyFotosIA.ts.
 *
 * Uso: node scripts/preview-longdesc2.mjs
 * Salida: scripts/preview-longdesc2.json (revisar antes de aplicar)
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore();
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) { console.error('Falta GROQ_API_KEY'); process.exit(1); }

const PROMPT = (nombre, includesActuales, longDesc2Actual, heroDesc, longDesc) => `Eres copywriter especializado en empresas de eventos y decoraciones peruanas. Escribes para J&M Decoraciones y Eventos de Sechura, Piura. Tono: emotivo, cálido, familiar, español peruano natural.

Contexto real de ESTE servicio específico "${nombre}" (úsalo para que el texto suene a este servicio y no a una plantilla genérica):
- Subtítulo hero: "${heroDesc}"
- Párrafo de la sección "¿por qué elegirnos?": "${longDesc}"

Esta página tiene DOS secciones que hoy están duplicadas y necesito que dejen de estarlo:

1) "¿Por qué elegir a J&M Decoraciones y Eventos?" — debe hablar de RAZONES/BENEFICIOS para confiar en la empresa EN ESTE SERVICIO CONCRETO (no genéricas de cualquier empresa de eventos): qué tipo de cliente lo vive, qué momento emocional resuelve, qué detalle de ejecución importa aquí en particular, qué lo hace distinto a los demás servicios de la lista de includes. NUNCA debe listar los rubros del paquete (decoración, catering, fotografía, vestuario, etc.) ni caer en frases de relleno tipo "experiencia y compromiso" que sirvan para cualquier servicio.

2) "Todo lo que Necesitas en un Solo Paquete" — este es el desglose CONCRETO del paquete y ya está bien, NO lo toques. Aquí están sus 6 ítems actuales, para que sepas qué NO debes repetir en la sección 1:
${includesActuales.map(i => `- ${i.title}: ${i.desc}`).join('\n')}

Texto actual de la sección 1 (probablemente duplica el paquete o es genérico, corrígelo):
"${longDesc2Actual}"

Genera el nuevo texto para la sección 1 ("longDesc2"): una lista de 5-6 razones/beneficios ESPECÍFICOS de este servicio, una por línea, SIN checkmarks ni viñetas (el frontend ya las agrega). Cada línea debe ser una FRASE COMPLETA con sentido propio (sujeto + razón concreta), de 6 a 12 palabras — NO uses fragmentos sueltos de 2-3 palabras tipo "Momentos únicos" o "Recuerdos inolvidables", eso no dice nada. Evita también abrir con la muletilla "Coordinamos cada detalle contigo..." (ya se usó demasiado en otros servicios), varía el verbo inicial de cada línea. Ejemplo de frase válida y específica: "Adaptamos el show a la edad exacta de los niños invitados." Ejemplo de frase INVÁLIDA (muy corta, vacía de contenido): "Momentos inolvidables". Que no repita ningún título de "includes" arriba, y que NO sea intercambiable con el texto de otro servicio de la misma empresa.

RESPONDE ÚNICAMENTE con este JSON, sin markdown ni texto extra:
{"longDesc2": "razón 1\\nrazón 2\\nrazón 3\\nrazón 4\\nrazón 5"}`;

async function generar(servicio) {
  const { title, includes, longDesc2, heroDesc, longDesc } = servicio;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: PROMPT(title, includes, longDesc2, heroDesc, longDesc) }],
      temperature: 0.75,
      max_completion_tokens: 500,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await res.json();
  if (process.env.DEBUG) console.log('RAW:', JSON.stringify(data).slice(0, 800));
  const text = data.choices?.[0]?.message?.content || '{}';
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(clean);
    if (!parsed.longDesc2) {
      return { ok: false, error: `JSON sin longDesc2. Respuesta cruda: ${text.slice(0, 300)}` };
    }
    return { ok: true, longDesc2: parsed.longDesc2 };
  } catch {
    return { ok: false, error: `Respuesta inválida: ${text.slice(0, 300)}` };
  }
}

const outPathGlobal = path.join(__dirname, 'preview-longdesc2.json');
const soloIds = process.argv.slice(2).filter(a => !a.startsWith('--'));

async function main() {
  const snap = await db.collection('services').get();
  const previos = existsSync(outPathGlobal) ? JSON.parse(readFileSync(outPathGlobal, 'utf8')) : [];
  const resultados = soloIds.length > 0 ? previos.filter(r => !soloIds.includes(r.id)) : [];

  for (const doc of snap.docs) {
    if (soloIds.length > 0 && !soloIds.includes(doc.id)) continue;
    const d = doc.data();
    const servicio = {
      id: doc.id,
      title: d.title,
      includes: (d.detail?.includes || []).map(i => ({ title: i.title, desc: i.desc })),
      longDesc2: d.detail?.longDesc2 || '',
      heroDesc: d.detail?.hero_desc || '',
      longDesc: d.detail?.longDesc || '',
    };

    if (servicio.includes.length === 0) {
      console.log(`[${servicio.id}] sin "includes", se omite (nada que evitar duplicar)`);
      continue;
    }

    console.log(`[${servicio.id}] generando... (${servicio.title})`);
    const r = await generar(servicio);
    resultados.push({
      id: servicio.id,
      title: servicio.title,
      longDesc2_actual: servicio.longDesc2,
      longDesc2_propuesto: r.ok ? r.longDesc2 : null,
      error: r.ok ? null : r.error,
    });
    console.log(r.ok ? `  -> OK` : `  -> ERROR: ${r.error}`);
  }

  resultados.sort((a, b) => snap.docs.findIndex(d => d.id === a.id) - snap.docs.findIndex(d => d.id === b.id));
  writeFileSync(outPathGlobal, JSON.stringify(resultados, null, 2), 'utf8');
  console.log(`\nGuardado en ${outPathGlobal}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
