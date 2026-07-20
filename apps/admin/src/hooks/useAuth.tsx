'use client';
import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  signOut as fbSignOut, type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, COL } from '@/lib/firebase';
import type { Usuario, RolUsuario } from '@/types';

interface AuthCtx {
  user:     User | null;
  profile:  Usuario | null;
  loading:  boolean;
  isAdmin:  boolean;
  isEditor: boolean;
  signIn:   (email: string, pass: string) => Promise<void>;
  signOut:  () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user:null, profile:null, loading:true,
  isAdmin:false, isEditor:false,
  signIn: async()=>{}, signOut: async()=>{},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User|null>(null);
  const [profile, setProfile] = useState<Usuario|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, COL.USUARIOS, u.uid));
          if (snap.exists()) {
            const data = snap.data() as Usuario;
            if (data.activo === false) {
              await fbSignOut(auth);
              await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
              return;
            }
            setProfile(data);
          } else {
            setProfile({ uid:u.uid, email:u.email||'', nombre:u.email||'', rol:'lector', activo:true, creadoEn:new Date().toISOString() });
          }
        } catch { setProfile(null); }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const signIn  = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const idToken = await cred.user.getIdToken();
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, email }),
    });
    if (!res.ok) {
      // La cuenta de Firebase Auth es válida, pero no se pudo emitir la
      // cookie de sesión (ej. rate limit) — deshacemos el login para no
      // dejar al usuario con sesión de Firebase pero sin acceso a /dashboard.
      await fbSignOut(auth);
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'No se pudo iniciar sesión');
    }
  };
  const signOut = async () => {
    await fbSignOut(auth);
    await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
    setProfile(null);
  };

  const rol = profile?.rol as RolUsuario | undefined;

  return (
    <Ctx.Provider value={{
      user, profile, loading,
      isAdmin:  rol === 'admin',
      isEditor: rol === 'admin' || rol === 'editor',
      signIn, signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
