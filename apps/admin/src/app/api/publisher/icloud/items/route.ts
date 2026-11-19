import { NextRequest, NextResponse } from 'next/server';
import { cuentaPropia } from '@/lib/castreamImport';
import { listarICloud } from '@/lib/icloudProtocol';
import { castreamDb, verifyAppUser } from '@/lib/publisher';

/**
 * Fotos y videos actuales de un álbum conectado, marcando los ya importados.
 *
 * POST { accountId } → { items: [{ id, thumbUrl, tipo, width, height, importado }] }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { accountId } = await req.json().catch(() => ({}));
  const cuenta = await cuentaPropia(auth.uid, accountId, 'icloud');
  if (!cuenta) return NextResponse.json({ error: 'Álbum no encontrado' }, { status: 404 });

  try {
    const items = await listarICloud(String(cuenta.meta.url));
    const { data: previos } = await castreamDb().from('imported_media').select('source_item_id').eq('source_account_id', cuenta.id);
    const ya = new Set((previos ?? []).map(p => p.source_item_id));
    return NextResponse.json({
      items: items.map(({ id, thumbUrl, tipo, width, height }) => ({ id, thumbUrl, tipo, width, height, importado: ya.has(id) })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudo leer el álbum de iCloud' }, { status: 502 });
  }
}
