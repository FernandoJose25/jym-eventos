/**
 * Reemplaza la URL del video del Hero (el .mov de 73 MB) por la versión
 * optimizada (16 MB) en todos los documentos de site_config donde aparezca.
 * El archivo original NO se borra del bucket, por si hay que revertir.
 *
 * Uso:
 *   node scripts/cambiar-video-hero.mjs --dry-run   (solo muestra dónde está)
 *   node scripts/cambiar-video-hero.mjs             (reemplaza de verdad)
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

const URL_VIEJA = 'https://storage.googleapis.com/jym-eventos.firebasestorage.app/migrado-cloudinary/servicios/bv-vogue/qtpahovx0rfzijiybckx.mov';
const URL_NUEVA = 'https://storage.googleapis.com/jym-eventos.firebasestorage.app/hero/hero-bg-1784653881050.mp4';

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!existsSync(envPath)) { console.error(`No se encontró ${envPath}`); process.exit(1); }
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

/* Reemplazo recursivo en cualquier campo string, incluyendo mapas/arrays */
function replaceDeep(value, hits) {
  if (typeof value === 'string') {
    if (value === URL_VIEJA) { hits.count++; return URL_NUEVA; }
    return value;
  }
  if (Array.isArray(value)) return value.map(v => replaceDeep(v, hits));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = replaceDeep(v, hits);
    return out;
  }
  return value;
}

// El video puede estar referenciado en site_config (hero de la home) o en
// services (fue migrado bajo servicios/bv-vogue/): se revisan ambas.
const COLECCIONES = ['site_config', 'services'];

let totalDocs = 0;
for (const colName of COLECCIONES) {
  const snap = await db.collection(colName).get();
  for (const doc of snap.docs) {
    const hits = { count: 0 };
    const nuevo = replaceDeep(doc.data(), hits);
    if (hits.count === 0) continue;
    totalDocs++;
    console.log(`[${colName}/${doc.id}] ${hits.count} referencia(s) al video viejo`);
    if (!DRY_RUN) {
      await db.collection(colName).doc(doc.id).set(nuevo);
      console.log('  -> actualizado');
    }
  }
}

if (totalDocs === 0) console.log('No se encontró la URL vieja en ninguna colección revisada.');
else if (DRY_RUN) console.log('\nDry run: ejecuta sin --dry-run para aplicar.');
