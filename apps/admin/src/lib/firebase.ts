import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth }      from 'firebase/auth';

const cfg = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApp() : initializeApp(cfg);

export const db   = getFirestore(app);
export const auth = getAuth(app);
export default app;

// Nombres REALES de colecciones en Firestore
export const COL = {
  SERVICIOS:     'services',
  GALERIA:       'gallery_items',
  TESTIMONIOS:   'testimonials',
  MENSAJES:      'mensajes',
  USUARIOS:      'usuarios',
  CONFIGURACION: 'site_config',
} as const;
