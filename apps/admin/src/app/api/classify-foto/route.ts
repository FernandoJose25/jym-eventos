import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { clasificarLoteConIA } from '@/lib/classifyFotosIA';

const MAX_FOTOS_POR_LOTE = 4;

export async function POST(req: NextRequest) {
    const auth = await verifyToken(req);
    if (auth.response) return auth.response;

    const { fotos, eventosConocidos } = await req.json();
    if (!Array.isArray(fotos) || fotos.length === 0) {
        return NextResponse.json({ error: 'fotos (array) requerido' }, { status: 400 });
    }
    if (fotos.length > MAX_FOTOS_POR_LOTE) {
        return NextResponse.json({ error: `Máximo ${MAX_FOTOS_POR_LOTE} fotos por lote` }, { status: 400 });
    }
    for (const f of fotos) {
        if (!f || typeof f.url !== 'string') {
            return NextResponse.json({ error: 'cada foto necesita { id, url }' }, { status: 400 });
        }
    }

    const conocidos: string[] = Array.isArray(eventosConocidos)
        ? eventosConocidos.filter((e: unknown): e is string => typeof e === 'string' && e.trim().length > 0).slice(0, 20)
        : [];

    try {
        const resultados = await clasificarLoteConIA(fotos, conocidos);
        return NextResponse.json({ fotos: resultados });
    } catch (e: any) {
        console.error('[classify-foto]', e);
        return NextResponse.json({ error: e.message || 'Error clasificando el lote de imágenes' }, { status: 500 });
    }
}
