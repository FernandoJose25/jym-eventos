import { NextRequest, NextResponse } from 'next/server';
import { decryptToken, encryptToken } from '@/lib/googleTokenCrypto';
import { castreamDb, graph, paginasDeFacebook, verifyAppUser, type PaginaFacebook } from '@/lib/publisher';

/**
 * Paso 3: Páginas de la persona con su aptitud para Live, y elección de cuáles
 * conectar. Cada consulta revalida seguidores y roles (cambian con el tiempo) y
 * actualiza las Páginas ya conectadas en connected_accounts.
 */

interface Conectada { id: string; page_id: string }

/** Páginas frescas de Graph con el token de usuario guardado, o null si no hay Facebook vinculado. */
async function paginasFrescas(uid: string): Promise<{ paginas: PaginaFacebook[]; fbUserName: string } | null> {
  const { data } = await castreamDb().from('secrets')
    .select('facebook_user_token, facebook_user_name').eq('user_id', uid).maybeSingle();
  if (!data?.facebook_user_token) return null;
  const paginas = await paginasDeFacebook(decryptToken(data.facebook_user_token));
  return { paginas, fbUserName: data.facebook_user_name };
}

async function conectadasDe(uid: string): Promise<Conectada[]> {
  const { data, error } = await castreamDb().from('connected_accounts')
    .select('id, page_id').eq('user_id', uid).eq('provider', 'facebook');
  if (error) throw error;
  return data;
}

interface IgDePagina { usuario: string | null; motivo: string | null }

/**
 * Cuentas profesionales de Instagram vinculadas a las Páginas conectadas: quedan como
 * destinos (provider 'instagram') y publican con el token de su Página (Meta ya no da a
 * las apps nuevas el login propio de Instagram). Devuelve y guarda en la Página qué
 * Instagram se encontró o por qué no.
 */
async function sincronizarInstagram(uid: string, businessId: string, paginas: PaginaFacebook[]): Promise<Record<string, IgDePagina>> {
  const db = castreamDb();
  const resultado: Record<string, IgDePagina> = {};
  const encontradas = await Promise.all(paginas.map(async p => {
    try {
      const data = await graph<{ instagram_business_account?: { id: string; username?: string } }>(
        `/${p.pageId}`, { fields: 'instagram_business_account{id,username}', access_token: p.accessToken },
      );
      const ig = data.instagram_business_account;
      resultado[p.pageId] = ig
        ? { usuario: ig.username ? `@${ig.username}` : 'Instagram', motivo: null }
        : { usuario: null, motivo: 'La Página no tiene una cuenta profesional de Instagram vinculada.' };
      return ig ? { ig, pageId: p.pageId } : null;
    } catch (e: any) {
      resultado[p.pageId] = { usuario: null, motivo: `Facebook no dejó ver el Instagram de la Página: ${e.message}` };
      return null;
    }
  }));

  await Promise.all(paginas.map(p => db.from('connected_accounts').update({ meta: { instagram: resultado[p.pageId] } })
    .eq('user_id', uid).eq('provider', 'facebook').eq('page_id', p.pageId)));
  const igs = encontradas.filter((x): x is NonNullable<typeof x> => !!x);
  if (igs.length) {
    const { error } = await db.from('connected_accounts').upsert(igs.map(({ ig, pageId }) => ({
      user_id: uid,
      business_id: businessId,
      provider: 'instagram',
      page_id: ig.id,
      external_id: ig.id,
      page_name: ig.username ?? null,
      label: ig.username ? `@${ig.username}` : 'Instagram',
      meta: { facebookPageId: pageId },
    })), { onConflict: 'user_id,provider,page_id' });
    if (error) throw error;
  }
  // Las que ya no cuelgan de una Página conectada dejan de ser destino.
  const vigentes = igs.map(x => x.ig.id);
  let borrar = db.from('connected_accounts').delete().eq('user_id', uid).eq('provider', 'instagram');
  if (vigentes.length) borrar = borrar.not('page_id', 'in', `(${vigentes.join(',')})`);
  await borrar;
  return resultado;
}

const errorGraph = (e: any) => NextResponse.json(
  { error: e.message || 'Error consultando Facebook', revincular: true },
  { status: 502 },
);

/* ── GET: Páginas disponibles + cuáles están conectadas ── */
export async function GET(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  let frescas;
  try {
    frescas = await paginasFrescas(auth.uid);
  } catch (e) {
    return errorGraph(e);
  }
  if (!frescas) return NextResponse.json({ vinculado: false, paginas: [] });

  const db = castreamDb();
  const conectadas = await conectadasDe(auth.uid);
  await Promise.all(conectadas.map(c => {
    const p = frescas.paginas.find(x => x.pageId === c.page_id);
    return db.from('connected_accounts').update(p
      ? { page_name: p.pageName, label: p.pageName, followers: p.followers, eligible_for_live: p.eligibleForLive, ineligible_reason: p.motivo }
      : { eligible_for_live: false, ineligible_reason: 'Ya no administras esta Página.' }).eq('id', c.id);
  }));

  const ids = new Set(conectadas.map(c => c.page_id));
  const instagram = await sincronizarInstagram(auth.uid, auth.businessId, frescas.paginas.filter(p => ids.has(p.pageId)))
    .catch((e): Record<string, IgDePagina> => { console.error('[publisher/facebook/pages] instagram', e); return {}; });
  return NextResponse.json({
    vinculado: true,
    fbUserName: frescas.fbUserName,
    paginas: frescas.paginas.map(({ accessToken: _, ...p }) => ({ ...p, conectada: ids.has(p.pageId), instagram: instagram[p.pageId] ?? null })),
  });
}

/* ── POST: conectar exactamente las Páginas elegidas  { pageIds: string[] } ── */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { pageIds } = await req.json().catch(() => ({}));
  if (!Array.isArray(pageIds) || pageIds.some(id => typeof id !== 'string')) {
    return NextResponse.json({ error: 'pageIds inválido' }, { status: 400 });
  }

  let frescas;
  try {
    frescas = await paginasFrescas(auth.uid);
  } catch (e) {
    return errorGraph(e);
  }
  if (!frescas) return NextResponse.json({ error: 'Primero vincula tu Facebook' }, { status: 400 });

  const elegidas = frescas.paginas.filter(p => pageIds.includes(p.pageId));
  if (elegidas.length !== pageIds.length) {
    return NextResponse.json({ error: 'Alguna Página ya no está disponible; actualiza la lista' }, { status: 400 });
  }

  try {
    const db = castreamDb();
    const sobran = (await conectadasDe(auth.uid)).filter(c => !pageIds.includes(c.page_id)).map(c => c.id);
    if (sobran.length) {
      const { error } = await db.from('connected_accounts').delete().in('id', sobran);
      if (error) throw error;
    }
    if (elegidas.length) {
      // connected_at no se envía: conserva la fecha original de las que ya estaban conectadas.
      const { error } = await db.from('connected_accounts').upsert(elegidas.map(p => ({
        user_id: auth.uid,
        business_id: auth.businessId,
        provider: 'facebook',
        label: p.pageName,
        page_id: p.pageId,
        page_name: p.pageName,
        followers: p.followers,
        eligible_for_live: p.eligibleForLive,
        ineligible_reason: p.motivo,
      })), { onConflict: 'user_id,provider,page_id' });
      if (error) throw error;
    }
    // Los tokens de Página (no expiran si salen de un token de usuario de larga duración) solo viven cifrados en secrets.
    const { error } = await db.from('secrets').update({
      facebook_page_tokens: Object.fromEntries(elegidas.map(p => [p.pageId, encryptToken(p.accessToken)])),
      updated_at: new Date().toISOString(),
    }).eq('user_id', auth.uid);
    if (error) throw error;
    await sincronizarInstagram(auth.uid, auth.businessId, elegidas);

    return NextResponse.json({ ok: true, conectadas: elegidas.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudieron guardar las Páginas' }, { status: 500 });
  }
}
