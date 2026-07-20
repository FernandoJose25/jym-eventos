/**
 * Aplica a Firestore el "longDesc2" aprobado en preview-longdesc2.json
 * (generado por preview-longdesc2.mjs). Solo toca detail.longDesc2 de
 * cada servicio, no modifica ningún otro campo.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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
const previewPath = path.join(__dirname, 'preview-longdesc2.json');
if (!existsSync(previewPath)) { console.error('No existe preview-longdesc2.json, corre primero preview-longdesc2.mjs'); process.exit(1); }

const items = JSON.parse(readFileSync(previewPath, 'utf8'));

async function main() {
  let aplicados = 0, omitidos = 0;
  for (const item of items) {
    if (!item.longDesc2_propuesto) {
      console.log(`[${item.id}] omitido (sin propuesta, error: ${item.error})`);
      omitidos++;
      continue;
    }
    await db.collection('services').doc(item.id).update({
      'detail.longDesc2': item.longDesc2_propuesto,
    });
    console.log(`[${item.id}] "${item.title}" -> actualizado`);
    aplicados++;
  }
  console.log(`\nAplicados: ${aplicados}, omitidos: ${omitidos}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
