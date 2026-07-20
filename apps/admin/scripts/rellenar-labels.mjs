/**
 * Rellena categoryLabel y titleAccentWord (solo estos dos: son etiquetas
 * de estilo/copy, no datos verificables como stats o testimonios) en los
 * servicios que los tengan vacíos. Aplica directo a Firestore.
 */
import { readFileSync } from 'node:fs';
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

const PROMPT = (title, heroDesc) => `Eres copywriter de J&M Decoraciones y Eventos, Sechura, Piura. Español peruano natural.

Servicio: "${title}"
Subtítulo hero: "${heroDesc}"

El H1 que se muestra en la página es EXACTAMENTE este texto: "${title}" (no un título largo, es el nombre corto del servicio).

Genera dos textos cortos:
1) "categoryLabel": badge pequeño sobre el título de la página, formato "Categoría · Subcategoría", ej. "Celebraciones · Bodas" o "Corporativo · Activaciones". Debe reflejar la categoría real de este servicio.
2) "titleAccentWord": una palabra o frase CORTA que sea una SUBCADENA EXACTA (mismas mayúsculas/minúsculas, sin agregar ni quitar letras) dentro de "${title}", para resaltarla en cursiva/color dentro del H1. Si "${title}" tiene una sola palabra, usa esa palabra completa. Si tiene varias, elige la más significativa (no artículos ni preposiciones).

RESPONDE SOLO JSON: {"categoryLabel":"...","titleAccentWord":"..."}`;

async function generar(s) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: PROMPT(s.title, s.heroDesc) }],
      temperature: 0.6,
      max_completion_tokens: 200,
      response_format: { type: 'json_object' },
    }),
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (!parsed.categoryLabel || !parsed.titleAccentWord) return { ok: false, error: `incompleto: ${text.slice(0,200)}` };
    return { ok: true, categoryLabel: parsed.categoryLabel, titleAccentWord: parsed.titleAccentWord };
  } catch {
    return { ok: false, error: `JSON inválido: ${text.slice(0, 200)}` };
  }
}

const forceAccent = process.argv.includes('--force-accent');

async function main() {
  const snap = await db.collection('services').get();
  let aplicados = 0, omitidos = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const detail = d.detail || {};
    const needsCategoryLabel = !detail.categoryLabel;
    const needsAccentWord = !detail.titleAccentWord || forceAccent;
    if (!needsCategoryLabel && !needsAccentWord) {
      console.log(`[${doc.id}] ya tiene ambos, se omite`);
      omitidos++;
      continue;
    }
    const s = { title: d.title, heroDesc: detail.hero_desc || '' };
    console.log(`[${doc.id}] "${s.title}" generando...`);
    const r = await generar(s);
    if (!r.ok) {
      console.log(`  -> ERROR: ${r.error}`);
      omitidos++;
      continue;
    }
    if (r.titleAccentWord && !s.title.includes(r.titleAccentWord)) {
      console.log(`  -> RECHAZADO: titleAccentWord "${r.titleAccentWord}" no es subcadena de "${s.title}"`);
      omitidos++;
      continue;
    }
    const update = {};
    if (needsCategoryLabel) update['detail.categoryLabel'] = r.categoryLabel;
    if (needsAccentWord) update['detail.titleAccentWord'] = r.titleAccentWord;
    await db.collection('services').doc(doc.id).update(update);
    console.log(`  -> categoryLabel: "${r.categoryLabel}" | titleAccentWord: "${r.titleAccentWord}"`);
    aplicados++;
  }
  console.log(`\nAplicados: ${aplicados}, omitidos: ${omitidos}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
