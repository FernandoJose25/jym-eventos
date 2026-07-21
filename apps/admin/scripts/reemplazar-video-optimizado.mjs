/**
 * Sube un video optimizado al bucket (con Cache-Control inmutable) y
 * reemplaza la URL vieja por la nueva en todas las colecciones conocidas de
 * Firestore. El archivo original NO se borra del bucket (respaldo).
 *
 * Uso:
 *   node scripts/reemplazar-video-optimizado.mjs <archivo-local.mp4> <url-vieja>
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const [localFile, urlVieja] = process.argv.slice(2);
if (!localFile || !existsSync(localFile) || !urlVieja) {
  console.error('Uso: node scripts/reemplazar-video-optimizado.mjs <archivo-local.mp4> <url-vieja>');
  process.exit(1);
}

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

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  storageBucket: BUCKET,
});

const db = getFirestore();
const bucket = getStorage().bucket();

/* 1. Subir el archivo optimizado */
const baseName = path.basename(localFile, path.extname(localFile));
const dest = `videos-optimizados/${baseName}-${Date.now()}.mp4`;
const file = bucket.file(dest);
await file.save(readFileSync(localFile), {
  metadata: { contentType: 'video/mp4', cacheControl: 'public, max-age=31536000, immutable' },
  resumable: false,
});
await file.makePublic();
const urlNueva = `https://storage.googleapis.com/${BUCKET}/${dest}`;
console.log(`Subido: ${urlNueva}`);

/* 2. Reemplazar en Firestore (recursivo, cualquier campo string) */
function replaceDeep(value, hits) {
  if (typeof value === 'string') {
    if (value === urlVieja) { hits.count++; return urlNueva; }
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

const COLECCIONES = [
  'site_config', 'services', 'gallery_items', 'albums', 'testimonials',
  'camara_invitado_links', 'redes_sociales_config',
];

let total = 0;
for (const colName of COLECCIONES) {
  const snap = await db.collection(colName).get();
  for (const doc of snap.docs) {
    const hits = { count: 0 };
    const nuevo = replaceDeep(doc.data(), hits);
    if (hits.count === 0) continue;
    await db.collection(colName).doc(doc.id).set(nuevo);
    total += hits.count;
    console.log(`[${colName}/${doc.id}] ${hits.count} referencia(s) actualizada(s)`);
  }
}
if (total === 0) console.warn('ADVERTENCIA: la URL vieja no se encontró en Firestore (¿ya fue reemplazada?)');
