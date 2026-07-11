import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';

/**
 * Proxy server-side: recibe la orden de revalidar desde el cliente del admin
 * (ya autenticado) y la reenvía a apps/web con el secret, que nunca se expone
 * al navegador. Best-effort — si la web pública no responde, no es un error
 * bloqueante para quien guardó la foto/álbum.
 */
export async function POST(req: NextRequest) {
    const auth = await verifyToken(req);
    if (auth.response) return auth.response;

    const webUrl = process.env.WEB_URL;
    const secret = process.env.REVALIDATE_SECRET;
    if (!webUrl || !secret) return NextResponse.json({ ok: false, error: 'No configurado' });

    const { slug, slugs } = await req.json().catch(() => ({}));

    try {
        await fetch(`${webUrl.replace(/\/$/, '')}/api/revalidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
            body: JSON.stringify({ ...(slug ? { slug } : {}), ...(Array.isArray(slugs) ? { slugs } : {}) }),
        });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false });
    }
}
