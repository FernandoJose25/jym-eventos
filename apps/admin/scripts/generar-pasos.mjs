/**
 * Genera detail.pasos (+ pasosEyebrow/pasosTitulo) para los servicios cuyo
 * flujo de trabajo es distinto al genérico de decoración (Consulta ->
 * Propuesta y Diseño -> Montaje el Día D -> Desmontaje), que solo aplica
 * bien a decoracion-tematica.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadEnvLocal() {
  const raw = readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
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

const OBJETIVO = {
  pbUridoLlNOGutalQTx3: { // Shows Infantiles
    titulo: 'Tu Show en 4 Pasos',
    consigna: 'contratar un show infantil de animación: desde la consulta inicial hasta el día del evento (ej. elegir personaje/temática, confirmar detalles, el show en vivo)',
  },
  ULmpQx9DlYfATNVWqNQE: { // Show Hora Loca
    titulo: 'Tu Hora Loca en 4 Pasos',
    consigna: 'contratar el show hora loca: desde la consulta hasta la animación en vivo el día del evento',
  },
  bodas: {
    titulo: 'Tu Boda en 4 Pasos',
    consigna: 'planificar y ejecutar una boda con la empresa: desde la primera consulta y visión de la pareja, pasando por la propuesta integral (decoración, catering, entretenimiento), hasta el día de la boda',
  },
  WJitTKxUGkUf0Rg7YUmy: { // Activaciones Empresariales
    titulo: 'Tu Activación en 4 Pasos',
    consigna: 'contratar una activación empresarial: desde el briefing con la marca, pasando por la propuesta creativa, hasta la ejecución el día del evento corporativo',
  },
  quinceanos: {
    titulo: 'Tu Fiesta de Quince en 4 Pasos',
    consigna: 'planificar una fiesta de quinceañera: desde la consulta con la familia, la elección de temática, la propuesta y coordinación, hasta el día de la celebración',
  },
  'bv-vogue': { // BMCABINAS
    titulo: 'Tu Cabina Fotográfica en 4 Pasos',
    consigna: 'contratar el servicio de cabina fotográfica para un evento: desde la reserva, la personalización de fondos/accesorios, hasta la instalación y uso el día del evento',
  },
  EantJBf9w8Di77gO8J0i: { // Catering y Carritos Snacks
    titulo: 'Tu Catering en 4 Pasos',
    consigna: 'contratar el servicio de catering y carritos de snacks: desde la consulta de menú/gustos, la propuesta y cotización, hasta la instalación y atención el día del evento',
  },
  '9R8bbtPvmncN4SI9w0Cf': { // Estudio Creativo Audiovisual
    titulo: 'Tu Cobertura en 4 Pasos',
    consigna: 'contratar cobertura fotográfica/video de un evento: desde la consulta inicial, la planificación de tomas/momentos clave, la cobertura el día del evento, hasta la entrega final del material editado',
  },
  promociones: {
    titulo: 'Tu Paquete Promocional en 4 Pasos',
    consigna: 'contratar un paquete promocional (combo de servicios con descuento): desde la consulta de qué incluye el paquete, la confirmación y reserva, hasta la ejecución el día del evento',
  },
};

const PROMPT = (title, heroDesc, consigna) => `Eres copywriter de J&M Decoraciones y Eventos, Sechura, Piura. Español peruano natural.

Servicio: "${title}"
Contexto: "${heroDesc}"

Genera una timeline de EXACTAMENTE 4 pasos para: ${consigna}.

Cada paso: título corto (2-4 palabras, title) y descripción de 1 frase (10-18 palabras, desc) explicando qué pasa en ese paso. Deben ser pasos REALES y en orden cronológico lógico, específicos de este servicio (no genéricos de "decoración y montaje" salvo que de verdad apliquen).

RESPONDE SOLO JSON: {"pasos":[{"num":1,"title":"...","desc":"..."},{"num":2,"title":"...","desc":"..."},{"num":3,"title":"...","desc":"..."},{"num":4,"title":"...","desc":"..."}]}`;

async function generar(title, heroDesc, consigna) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: PROMPT(title, heroDesc, consigna) }],
      temperature: 0.7,
      max_completion_tokens: 600,
      response_format: { type: 'json_object' },
    }),
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (!Array.isArray(parsed.pasos) || parsed.pasos.length === 0) return { ok: false, error: `sin pasos: ${text.slice(0,200)}` };
    return { ok: true, pasos: parsed.pasos.slice(0, 4).map((p, i) => ({ num: i + 1, title: p.title || '', desc: p.desc || '' })) };
  } catch {
    return { ok: false, error: `JSON inválido: ${text.slice(0, 200)}` };
  }
}

async function main() {
  let aplicados = 0, omitidos = 0;
  for (const [id, cfg] of Object.entries(OBJETIVO)) {
    const doc = await db.collection('services').doc(id).get();
    if (!doc.exists) { console.log(`[${id}] no existe, se omite`); omitidos++; continue; }
    const d = doc.data();
    const detail = d.detail || {};
    if (detail.pasos?.length > 0) { console.log(`[${id}] "${d.title}" ya tiene pasos, se omite`); omitidos++; continue; }

    console.log(`[${id}] "${d.title}" generando...`);
    const r = await generar(d.title, detail.hero_desc || '', cfg.consigna);
    if (!r.ok) { console.log(`  -> ERROR: ${r.error}`); omitidos++; continue; }

    await db.collection('services').doc(id).update({
      'detail.pasos': r.pasos,
      'detail.pasosEyebrow': 'Nuestro Proceso',
      'detail.pasosTitulo': cfg.titulo,
    });
    console.log(`  -> ${r.pasos.map(p => p.title).join(' -> ')}`);
    aplicados++;
  }
  console.log(`\nAplicados: ${aplicados}, omitidos: ${omitidos}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
