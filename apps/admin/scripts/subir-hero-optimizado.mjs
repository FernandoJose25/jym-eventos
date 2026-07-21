/**
 * Sube el video del Hero recomprimido (73 MB → 16 MB) al bucket como archivo
 * nuevo, con Cache-Control inmutable. NO modifica Firestore ni borra el
 * original: imprime la URL nueva para actualizar la configuración aparte.
 *
 * Uso: node scripts/subir-hero-optimizado.mjs <ruta-al-mp4>
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const localFile = process.argv[2];
if (!localFile || !existsSync(localFile)) {
  console.error('Uso: node scripts/subir-hero-optimizado.mjs <ruta-al-mp4>');
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

const bucket = getStorage().bucket();
const dest = `hero/hero-bg-${Date.now()}.mp4`;
const file = bucket.file(dest);

await file.save(readFileSync(localFile), {
  metadata: {
    contentType: 'video/mp4',
    cacheControl: 'public, max-age=31536000, immutable',
  },
  resumable: false,
});
await file.makePublic();

console.log(`Subido: https://storage.googleapis.com/${BUCKET}/${dest}`);
