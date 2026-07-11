import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * Fuerza a que las páginas con ISR (Galería/Álbumes, cacheadas hasta 1h)
 * se regeneren en la próxima visita, en vez de esperar la revalidación
 * automática. La llama el panel admin justo después de guardar fotos o
 * álbumes, para que los cambios se vean casi al instante en la web pública.
 *
 * Protegido con REVALIDATE_SECRET (mismo valor en ambos proyectos de Vercel).
 */
export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-revalidate-secret');
    if (!secret || secret !== process.env.REVALIDATE_SECRET) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { slug } = await req.json().catch(() => ({}));

    revalidatePath('/galeria');
    revalidatePath('/albumes');
    if (typeof slug === 'string' && slug) {
        revalidatePath(`/albumes/${slug}`);
    }

    return NextResponse.json({ ok: true });
}
