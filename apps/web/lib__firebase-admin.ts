import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
    });

export const adminDb = getFirestore(adminApp);
export default adminApp;
