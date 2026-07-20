/**
 * Migra assets de Cloudinary a Firebase Storage antes de que Cloudinary
 * desactive la cuenta gratuita, y reescribe las URLs en Firestore.
 *
 * Recorre TODOS los documentos de las colecciones conocidas de forma
 * recursiva (incluye mapas/arrays anidados como detail.*, brands[]),
 * detecta strings que sean URLs de Cloudinary por patrón (no una lista fija
 * de nombres de campo, para no perder campos no documentados), descarga
 * cada asset y lo re-sube a Firebase Storage bajo la misma ruta relativa.
 *
 * Uso:
 *   node scripts/migrar-cloudinary-a-storage.mjs --dry-run   (solo lista, no cambia nada)
 *   node scripts/migrar-cloudinary-a-storage.mjs             (migra de verdad)
 *
 * Requiere apps/admin/.env.local con las mismas credenciales que usa la app
 * (FIREBASE_ADMIN_*, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME).
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

/* ── Cargar .env.local manualmente (sin dependencias nuevas) ── */
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!existsSync(envPath)) {
    console.error(`No se encontró ${envPath}`);
    process.exit(1);
  }
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

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
if (!CLOUD_NAME) { console.error('Falta NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME en .env.local'); process.exit(1); }
if (!BUCKET) { console.error('Falta NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET en .env.local'); process.exit(1); }

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

/* URL típica: https://res.cloudinary.com/dvcmazqtp/image/upload/v169.../folder/name.ext
   o sin versión: https://res.cloudinary.com/dvcmazqtp/video/upload/folder/name.ext */
const CLOUDINARY_RE = new RegExp(
  `^https://res\\.cloudinary\\.com/${CLOUD_NAME}/(image|video)/upload/(?:[^/]+/)*?(?:v\\d+/)?(.+)$`
);

const COLECCIONES = [
  'services', 'gallery_items', 'albums', 'testimonials',
  'site_config', 'camara_invitado_links', 'redes_sociales_config',
];

/* ── Recorrido recursivo de campos ── */
function findCloudinaryUrls(value, pathPrefix, results) {
  if (typeof value === 'string') {
    const m = value.match(CLOUDINARY_RE);
    if (m) results.push({ path: pathPrefix, url: value, resourceType: m[1], publicPath: m[2] });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => findCloudinaryUrls(v, `${pathPrefix}[${i}]`, results));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) findCloudinaryUrls(v, pathPrefix ? `${pathPrefix}.${k}` : k, results);
  }
}

function setDeep(obj, fieldPath, newValue) {
  const tokens = fieldPath.match(/[^.[\]]+/g);
  let cur = obj;
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i];
    cur = /^\d+$/.test(t) ? cur[Number(t)] : cur[t];
  }
  const last = tokens[tokens.length - 1];
  if (/^\d+$/.test(last)) cur[Number(last)] = newValue; else cur[last] = newValue;
}

async function migrarAsset(url, resourceType, publicPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || (resourceType === 'video' ? 'video/mp4' : 'image/jpeg');

  const storagePath = `migrado-cloudinary/${publicPath}`;
  const file = bucket.file(storagePath);
  await file.save(buffer, { metadata: { contentType }, resumable: false });
  await file.makePublic();
  return `https://storage.googleapis.com/${BUCKET}/${storagePath}`;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no se modifica nada) ===' : '=== MIGRACIÓN REAL ===');
  let totalEncontrados = 0, totalMigrados = 0, totalErrores = 0;

  for (const colName of COLECCIONES) {
    const snap = await db.collection(colName).get();
    if (snap.empty) continue;

    for (const doc of snap.docs) {
      const data = doc.data();
      const found = [];
      findCloudinaryUrls(data, '', found);
      if (found.length === 0) continue;

      totalEncontrados += found.length;
      console.log(`\n[${colName}/${doc.id}] ${found.length} asset(s) de Cloudinary:`);

      const updates = {};
      for (const item of found) {
        console.log(`  - ${item.path}: ${item.url}`);
        if (DRY_RUN) continue;
        try {
          const nuevaUrl = await migrarAsset(item.url, item.resourceType, item.publicPath);
          setDeep(data, item.path, nuevaUrl);
          updates[item.path] = nuevaUrl;
          totalMigrados++;
          console.log(`    -> migrado: ${nuevaUrl}`);
        } catch (e) {
          totalErrores++;
          console.error(`    -> ERROR: ${e.message}`);
        }
      }

      if (!DRY_RUN && Object.keys(updates).length > 0) {
        await db.collection(colName).doc(doc.id).set(data);
        console.log(`  Documento actualizado en Firestore.`);
      }
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`Assets encontrados: ${totalEncontrados}`);
  if (!DRY_RUN) {
    console.log(`Migrados con éxito: ${totalMigrados}`);
    console.log(`Errores: ${totalErrores}`);
  } else {
    console.log('Ejecuta sin --dry-run para migrar de verdad.');
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
