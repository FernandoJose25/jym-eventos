// apps/web/src/lib/firebase-admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// SDK de SERVIDOR — úsalo solo dentro de generateMetadata, sitemap.ts, robots.ts
// y Server Components. Para todo lo que corre en el navegador (los *Client.tsx)
// sigue usando '@/lib/firebase' (SDK cliente), eso no cambia.
//
// Requiere una variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY en Vercel con
// el JSON completo de la cuenta de servicio (minificado en una sola línea):
//
//   Firebase Console → Configuración del proyecto → Cuentas de servicio →
//   Generar nueva clave privada → copia el contenido del .json descargado.
//
// En Vercel: Project Settings → Environment Variables →
//   Name:  FIREBASE_SERVICE_ACCOUNT_KEY
//   Value: pega el JSON completo tal cual (Vercel soporta valores largos)
//
// Instalación del paquete (falta en tu package.json actual):
//   pnpm add firebase-admin

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      'Falta FIREBASE_SERVICE_ACCOUNT_KEY en las variables de entorno. ' +
      'Ver instrucciones en lib/firebase-admin.ts'
    );
  }
  return JSON.parse(raw);
}

const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
    credential: cert(getServiceAccount()),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

export const adminDb = getFirestore(adminApp);
// Usado por /api/camara-invitado/upload para subir archivos de invitados sin
// sesión: el Admin SDK ignora storage.rules (que exige auth), así que el
// endpoint valida todo (token, álbum activo, tamaño/tipo, rate limit) antes
// de tocar el bucket — es la única puerta de escritura anónima al storage.
export const adminStorage = getStorage(adminApp);
export default adminApp;
