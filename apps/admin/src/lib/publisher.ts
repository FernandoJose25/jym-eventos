import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * CASTREAM (publicador + multistream): backend de la app en /api/publisher/*.
 * Sus datos viven en un proyecto Supabase propio (no en el Firestore de J&M):
 * aquí se usa con la service_role, que salta RLS, para las tablas solo-backend
 * (secrets, oauth_states) y para escribir app_config desde el panel Versiones.
 * Esquema: castream-jym/supabase/migrations.
 */

export * from './publisher-shared';

let client: SupabaseClient | undefined;

/** Se crea en el primer uso: `next build` no necesita las credenciales. */
export function castreamDb(): SupabaseClient {
  if (!client) {
    const url = process.env.CASTREAM_SUPABASE_URL;
    const key = process.env.CASTREAM_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Falta configurar CASTREAM_SUPABASE_URL y CASTREAM_SUPABASE_SERVICE_ROLE_KEY');
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

/** Usuario de la app (sesión de Supabase Auth en el header Bearer) y su negocio. */
export async function verifyAppUser(req: NextRequest): Promise<
  { uid: string; businessId: string; response?: never } | { uid?: never; businessId?: never; response: NextResponse }
> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return { response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  }
  const db = castreamDb();
  const { data, error } = await db.auth.getUser(header.slice(7));
  if (error || !data.user) {
    return { response: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }) };
  }
  const { data: perfil } = await db.from('profiles').select('business_id').eq('id', data.user.id).single();
  if (!perfil) {
    return { response: NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 }) };
  }
  return { uid: data.user.id, businessId: perfil.business_id };
}

/* ── Facebook / Graph API ── */

export const GRAPH_VERSION = 'v23.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * Mínimo de seguidores que Facebook exige a una Página para el Live Video API.
 * Reconfirmar el valor vigente al implementar la Fase 4 (plan, sección 3).
 */
export const MIN_SEGUIDORES_LIVE = 100;

/** Esquemas a los que el callback de OAuth puede volver (APK; el .exe sumará el suyo). */
export const RETURN_SCHEMES = ['castream://'];

export async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${GRAPH}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Graph API respondió ${res.status}`);
  }
  return data as T;
}

interface PaginaGraph {
  id: string;
  name: string;
  tasks?: string[];
  followers_count?: number;
  access_token: string;
}

export interface PaginaFacebook {
  pageId: string;
  pageName: string;
  followers: number;
  eligibleForLive: boolean;
  /** Por qué no puede transmitir (si no es apta). Publicar sigue habilitado. */
  motivo: string | null;
  accessToken: string;
}

/**
 * Páginas que administra la persona, con su aptitud para Live: debe poder hacer
 * CREATE_CONTENT en la Página y la Página debe tener el mínimo de seguidores.
 */
export async function paginasDeFacebook(userToken: string): Promise<PaginaFacebook[]> {
  const data = await graph<{ data: PaginaGraph[] }>('/me/accounts', {
    fields: 'id,name,tasks,followers_count,access_token',
    limit: '100',
    access_token: userToken,
  });
  return data.data.map((p) => {
    const followers = p.followers_count ?? 0;
    const puedeCrear = (p.tasks ?? []).includes('CREATE_CONTENT');
    const motivo = !puedeCrear
      ? 'Tu rol en esta Página no permite crear contenido.'
      : followers < MIN_SEGUIDORES_LIVE
        ? `La Página tiene ${followers} seguidores; Facebook pide al menos ${MIN_SEGUIDORES_LIVE} para transmitir en vivo.`
        : null;
    return { pageId: p.id, pageName: p.name, followers, eligibleForLive: !motivo, motivo, accessToken: p.access_token };
  });
}

export function facebookApp() {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) throw new Error('Falta configurar FACEBOOK_APP_ID y FACEBOOK_APP_SECRET en el servidor');
  return { appId, appSecret };
}

/** Debe ser idéntica en el diálogo de login y al canjear el código. */
export const facebookRedirectUri = (origin: string) => `${origin}/api/publisher/facebook/callback`;
