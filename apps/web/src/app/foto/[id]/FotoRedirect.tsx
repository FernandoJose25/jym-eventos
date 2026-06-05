'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FotoRedirect({ itemId, slug }: { itemId: string; slug?: string }) {
  const router = useRouter();

  useEffect(() => {
    const dest = slug
      ? `/servicios/${slug}?foto=${itemId}`
      : `/galeria?foto=${itemId}`;
    router.replace(dest);
  }, [itemId, slug, router]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#050d1a', color: '#fff', fontFamily: 'sans-serif', gap: 16,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid rgba(212,160,23,0.3)',
        borderTopColor: '#d4a017',
        animation: 'spin .8s linear infinite',
      }} />
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Cargando imagen…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
