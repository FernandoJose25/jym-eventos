import { NextRequest, NextResponse } from 'next/server';
import { cuentaPropia, importarLote } from '@/lib/castreamImport';
import { listarICloud } from '@/lib/icloudProtocol';
import { verifyAppUser } from '@/lib/publisher';

export const maxDuration = 60;

/** Máximo de archivos por llamada (la app manda los elegidos en lotes de este tamaño). */
const POR_LOTE = 4;

/**
 * Importa un lote de un álbum conectado. Se vuelve a leer el álbum en el servidor y
 * se toman los archivos por id: nunca se descarga una URL que mande el cliente.
 *
 * POST { accountId, ids: string[] } → { importados, omitidos, errores }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { accountId, ids } = await req.json().catch(() => ({}));
  const cuenta = await cuentaPropia(auth.uid, accountId, 'icloud');
  if (!cuenta) return NextResponse.json({ error: 'Álbum no encontrado' }, { status: 404 });
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > POR_LOTE || ids.some(id => typeof id !== 'string')) {
    return NextResponse.json({ error: `Manda entre 1 y ${POR_LOTE} archivos por vez` }, { status: 400 });
  }

  try {
    const elegidos = (await listarICloud(String(cuenta.meta.url))).filter(it => ids.includes(it.id));
    const resultado = await importarLote(cuenta, elegidos.map(it => ({
      sourceId: it.id,
      filename: it.filename,
      tipo: it.tipo === 'video' ? 'video' : 'image',
      width: it.width || null,
      height: it.height || null,
      descargar: async () => {
        const res = await fetch(it.fullUrl);
        if (!res.ok) throw new Error(`iCloud devolvió ${res.status} al descargar`);
        return Buffer.from(await res.arrayBuffer());
      },
    })));
    return NextResponse.json(resultado);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudo importar del álbum' }, { status: 502 });
  }
}
