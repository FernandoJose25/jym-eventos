'use client';

/**
 * Avisa a la web pública que regenere las páginas de Galería/Álbumes en la
 * próxima visita, en vez de esperar la revalidación automática de ISR (hasta
 * 1 hora). Se llama después de guardar/editar fotos o álbumes.
 *
 * Pasa por /api/revalidate-web (server-side, en este mismo admin) para no
 * exponer el secret de revalidación al navegador. Best-effort: si falla, no
 * bloquea el guardado.
 */
export async function revalidarWeb(idToken: string, slug?: string) {
    try {
        await fetch('/api/revalidate-web', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(slug ? { slug } : {}),
        });
    } catch {
        // best-effort: nunca bloqueamos el guardado por esto
    }
}
