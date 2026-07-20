import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCamaraLinkByToken } from '@/lib/camaraInvitado';
import CamaraInvitadoClient from './CamaraInvitadoClient';

export const dynamic = 'force-dynamic'; // siempre lee el estado activo/inactivo más reciente

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CamaraInvitadoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await getCamaraLinkByToken(token);
  if (!link) notFound();

  return <CamaraInvitadoClient link={link} />;
}
