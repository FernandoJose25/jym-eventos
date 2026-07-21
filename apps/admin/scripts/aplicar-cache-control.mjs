/**
 * Aplica Cache-Control de larga duración a todos los objetos ya existentes
 * en Firebase Storage. Los objetos subidos antes de este cambio no tienen
 * cabecera de caché, así que el navegador los re-descarga en cada visita
 * (DevTools reportaba ~8.4 MB desperdiciados por visita).
 *
 * Es seguro usar `immutable` porque los nombres de archivo incluyen
 * Date.now() (subidas del admin) o rutas de migración que nunca se
 * sobreescriben: un contenido nuevo siempre produce una URL nueva.
 *
 * Uso:
 *   node scripts/aplicar-cache-control.mjs --dry-run   (solo lista, no cambia nada)
 *   node scripts/aplicar-cache-control.mjs             (aplica de verdad)
 *
 * Requiere apps/admin/.env.local con las mismas credenciales que usa la app
 * (FIREBASE_ADMIN_*, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

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

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
if (!BUCKET) { console.error('Falta NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET en .env.local'); process.exit(1); }

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  storageBucket: BUCKET,
});

const bucket = getStorage().bucket();

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no se modifica nada) ===' : '=== APLICANDO CACHE-CONTROL ===');
  const [files] = await bucket.getFiles();
  console.log(`Objetos en el bucket: ${files.length}\n`);

  let actualizados = 0, yaCorrectos = 0, errores = 0;

  for (const file of files) {
    const actual = file.metadata.cacheControl || '(sin cabecera)';
    if (actual === CACHE_CONTROL) { yaCorrectos++; continue; }

    const sizeMb = (Number(file.metadata.size || 0) / 1024 / 1024).toFixed(2);
    console.log(`- ${file.name} (${sizeMb} MB) — actual: ${actual}`);
    if (DRY_RUN) { actualizados++; continue; }

    try {
      await file.setMetadata({ cacheControl: CACHE_CONTROL });
      actualizados++;
    } catch (e) {
      errores++;
      console.error(`  -> ERROR: ${e.message}`);
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`Ya correctos: ${yaCorrectos}`);
  console.log(DRY_RUN ? `Pendientes de actualizar: ${actualizados}` : `Actualizados: ${actualizados}`);
  if (errores) console.log(`Errores: ${errores}`);
  if (DRY_RUN) console.log('Ejecuta sin --dry-run para aplicar de verdad.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
