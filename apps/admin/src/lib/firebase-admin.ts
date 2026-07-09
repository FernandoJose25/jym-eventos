import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = getAuth();

// Firestore vía Admin SDK: se usa para datos server-only (ej. refresh tokens
// de Google Photos) que NUNCA deben pasar por el SDK cliente ni quedar
// expuestos por las reglas públicas de Firestore, porque el Admin SDK
// ignora por completo las Firestore Security Rules.
export const adminDb = getFirestore();
