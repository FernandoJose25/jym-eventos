import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sincronizarAlbumICloud } from '@/lib/icloudSync';

/**
 * Job en segundo plano: revisa TODOS los álbumes de iCloud conectados (de
 * todos los admins) y auto-importa las fotos nuevas que encuentre en cada
 * uno, sin que nadie tenga que abrir el panel.
 *
 * Configurado en vercel.json para correr por Vercel Cron. En el plan Hobby
 * de Vercel los cron jobs solo pueden correr 1 vez al día — si se necesita
 * más frecuencia, se puede llamar este mismo endpoint desde un cron externo
 * (ej. cron-job.org) cada 15-30 min, siempre mandando el header:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * CRON_SECRET debe estar configurado como variable de entorno en Vercel.
 */
export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    const header = req.headers.get('authorization');
    if (!secret || header !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const snap = await adminDb.collectionGroup('albums').get();
        // Solo nos interesan los docs que cuelgan de icloudAlbums/{uid}/albums/{albumId}
        const objetivos = snap.docs.filter(d => d.ref.parent.parent?.parent.id === 'icloudAlbums');

        const resultados: { uid: string; albumId: string; nuevas: number; error?: string }[] = [];
        for (const doc of objetivos) {
            const uid = doc.ref.parent.parent!.id;
            const r = await sincronizarAlbumICloud(uid, doc.id);
            resultados.push({ uid, albumId: r.albumId, nuevas: r.nuevas, error: r.error });
        }

        const totalNuevas = resultados.reduce((acc, r) => acc + r.nuevas, 0);
        return NextResponse.json({ ok: true, albumesRevisados: resultados.length, fotosNuevas: totalNuevas, resultados });
    } catch (e: any) {
        console.error('[cron/icloud-sync] error', e);
        return NextResponse.json({ error: e.message || 'Error en la sincronización automática' }, { status: 500 });
    }
}
