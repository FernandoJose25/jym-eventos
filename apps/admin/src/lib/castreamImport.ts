import { subirMedia } from './castreamMedia';
import { castreamDb } from './publisher';

/**
 * Importación común a Google Photos e iCloud: omite lo ya importado, descarga cada
 * archivo de su origen, lo sube al almacenamiento de CASTREAM y lo registra en
 * imported_media. Trabaja en lotes chicos para no pasar el límite de tiempo de la
 * función en Vercel: la app pide el siguiente lote hasta terminar.
 */

export const CONCURRENCIA = 2;

export interface Cuenta { id: string; user_id: string; business_id: string; provider: string; label: string; meta: Record<string, unknown> }

/** La cuenta de origen, solo si pertenece a quien la pide. */
export async function cuentaPropia(uid: string, accountId: unknown, provider: 'google_photos' | 'icloud'): Promise<Cuenta | null> {
  if (typeof accountId !== 'string') return null;
  const { data } = await castreamDb().from('connected_accounts')
    .select('id, user_id, business_id, provider, label, meta')
    .eq('id', accountId).eq('user_id', uid).eq('provider', provider).maybeSingle();
  return data as Cuenta | null;
}

export interface ArchivoOrigen {
  sourceId: string;
  filename: string;
  tipo: 'image' | 'video';
  width?: number | null;
  height?: number | null;
  descargar: () => Promise<Buffer>;
}

export interface ResultadoLote { importados: number; omitidos: number; errores: string[] }

export async function importarLote(cuenta: Cuenta, archivos: ArchivoOrigen[]): Promise<ResultadoLote> {
  const db = castreamDb();
  const { data: previos } = await db.from('imported_media').select('source_item_id')
    .eq('source_account_id', cuenta.id).in('source_item_id', archivos.map(a => a.sourceId));
  const ya = new Set((previos ?? []).map(p => p.source_item_id));
  const nuevos = archivos.filter(a => !ya.has(a.sourceId));

  const errores: string[] = [];
  let importados = 0;
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, nuevos.length) }, async () => {
    while (i < nuevos.length) {
      const a = nuevos[i++];
      try {
        const subido = await subirMedia({ datos: await a.descargar(), filename: a.filename, tipo: a.tipo, businessId: cuenta.business_id });
        const { error } = await db.from('imported_media').insert({
          user_id: cuenta.user_id,
          business_id: cuenta.business_id,
          source_account_id: cuenta.id,
          source_item_id: a.sourceId,
          media_type: a.tipo,
          storage_url: subido.url,
          storage_id: subido.storageId,
          width: subido.width ?? a.width ?? null,
          height: subido.height ?? a.height ?? null,
          filename: a.filename,
        });
        if (error) throw error;
        importados++;
      } catch (e: any) {
        errores.push(`${a.filename}: ${e.message || 'no se pudo importar'}`);
      }
    }
  }));
  return { importados, omitidos: archivos.length - nuevos.length, errores };
}
