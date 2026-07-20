/**
 * Genera detail.opciones (+ opcionesEyebrow/opcionesTitulo) para los
 * servicios que tienen variantes/estilos reales para elegir, replicando
 * el patrón visual de "Temáticas Más Populares" (antes exclusivo de
 * decoracion-tematica, ahora migrado a Firestore y genérico).
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

// id de Firestore -> qué tipo de variante mostrar y ejemplos concretos de referencia
const OBJETIVO = {
  pbUridoLlNOGutalQTx3: { // Shows Infantiles
    eyebrow: 'Personajes disponibles',
    titulo: 'Personajes Más Pedidos',
    consigna: 'personajes/temáticas de disfraces y animación que los padres pueden elegir para el show infantil (ej. superhéroes, princesas, animales, piratas)',
  },
  bodas: {
    eyebrow: 'Estilos disponibles',
    titulo: 'Estilos de Boda Más Populares',
    consigna: 'estilos de decoración/ambientación de boda que los novios pueden elegir (ej. rústico, elegante/clásico, playa, jardín, minimalista)',
  },
  ULmpQx9DlYfATNVWqNQE: { // Show Hora Loca
    eyebrow: 'Modalidades disponibles',
    titulo: 'Tipos de Animación Más Pedidos',
    consigna: 'tipos/estilos de animación de hora loca que se pueden elegir (ej. neón/luces, tropical, retro, espuma, batucada)',
  },
  quinceanos: {
    eyebrow: 'Estilos disponibles',
    titulo: 'Temáticas Más Elegidas para Quinceaños',
    consigna: 'temáticas de decoración/ambientación para fiesta de quince años que se pueden elegir (ej. princesas, glamour/Hollywood, jardín encantado, elegante en negro y dorado)',
  },
  WJitTKxUGkUf0Rg7YUmy: { // Activaciones Empresariales
    eyebrow: 'Formatos disponibles',
    titulo: 'Tipos de Activación Más Solicitados',
    consigna: 'tipos/formatos de activación empresarial que una marca puede elegir (ej. lanzamiento de producto, team building, stand interactivo, feria/exposición)',
  },
};

const PROMPT = (title, heroDesc, consigna) => `Eres copywriter de J&M Decoraciones y Eventos, Sechura, Piura. Español peruano natural.

Servicio: "${title}"
Contexto: "${heroDesc}"

Genera un grid de 6 opciones/variantes de ${consigna}.

Cada opción: un emoji representativo (icon), un título corto (2-4 palabras, title), y una descripción de 1 frase (8-15 palabras, desc) explicando en qué consiste esa variante.

RESPONDE SOLO JSON: {"opciones":[{"icon":"🎭","title":"...","desc":"..."},...6 items...]}`;

async function generar(title, heroDesc, consigna) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: PROMPT(title, heroDesc, consigna) }],
      temperature: 0.7,
      max_completion_tokens: 700,
      response_format: { type: 'json_object' },
    }),
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (!Array.isArray(parsed.opciones) || parsed.opciones.length === 0) return { ok: false, error: `sin opciones: ${text.slice(0,200)}` };
    return { ok: true, opciones: parsed.opciones.slice(0, 6) };
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
    if (detail.opciones?.length > 0) { console.log(`[${id}] "${d.title}" ya tiene opciones, se omite`); omitidos++; continue; }

    console.log(`[${id}] "${d.title}" generando...`);
    const r = await generar(d.title, detail.hero_desc || '', cfg.consigna);
    if (!r.ok) { console.log(`  -> ERROR: ${r.error}`); omitidos++; continue; }

    await db.collection('services').doc(id).update({
      'detail.opciones': r.opciones,
      'detail.opcionesEyebrow': cfg.eyebrow,
      'detail.opcionesTitulo': cfg.titulo,
    });
    console.log(`  -> ${r.opciones.length} opciones: ${r.opciones.map(o => o.title).join(', ')}`);
    aplicados++;
  }
  console.log(`\nAplicados: ${aplicados}, omitidos: ${omitidos}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
