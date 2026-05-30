import { auth } from './firebase';

export async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('No autenticado');
  return user.getIdToken();
}

export async function authHeaders(): Promise<{ Authorization: string; 'Content-Type': string }> {
  const token = await getToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
