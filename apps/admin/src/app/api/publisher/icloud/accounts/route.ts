import { NextRequest, NextResponse } from 'next/server';
import { idDeAlbumICloud, listarICloud } from '@/lib/icloudProtocol';
import { castreamDb, verifyAppUser } from '@/lib/publisher';

/**
 * Conecta un álbum compartido público de iCloud con una etiqueta. No hay login de Apple:
 * se guarda el link y las fotos se leen bajo demanda (protocolo no oficial de icloud.com).
 *
 * POST { url, label } → { id, total }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { url, label } = await req.json().catch(() => ({}));
  if (typeof url !== 'string' || !url.trim()) return NextResponse.json({ error: 'Pega el link del álbum compartido' }, { status: 400 });

  let externalId: string;
  let total: number;
  try {
    externalId = idDeAlbumICloud(url);
    total = (await listarICloud(url)).length;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudo leer el álbum de iCloud' }, { status: 400 });
  }

  const { data, error } = await castreamDb().from('connected_accounts').upsert({
    user_id: auth.uid,
    business_id: auth.businessId,
    provider: 'icloud',
    external_id: externalId,
    label: (typeof label === 'string' && label.trim().slice(0, 40)) || 'Álbum de iCloud',
    meta: { url: url.trim() },
  }, { onConflict: 'user_id,provider,external_id' }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id, total });
}
