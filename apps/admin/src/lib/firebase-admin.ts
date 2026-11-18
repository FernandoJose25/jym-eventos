import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

// La app de Admin se inicializa en el primer uso (no al importar el módulo):
// así `next build` puede recolectar los datos de las rutas API sin tener las
// credenciales de Firebase en el entorno de build.
function ensureApp() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });
  }
}

function lazy<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  return new Proxy({} as T, {
    get(_target, prop) {
      instance ??= factory();
      const value = Reflect.get(instance, prop, instance);
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  });
}

export const adminAuth: Auth = lazy(() => { ensureApp(); return getAuth(); });

// Firestore vía Admin SDK: se usa para datos server-only (ej. refresh tokens
// de Google Photos) que NUNCA deben pasar por el SDK cliente ni quedar
// expuestos por las reglas públicas de Firestore, porque el Admin SDK
// ignora por completo las Firestore Security Rules.
export const adminDb: Firestore = lazy(() => { ensureApp(); return getFirestore(); });
