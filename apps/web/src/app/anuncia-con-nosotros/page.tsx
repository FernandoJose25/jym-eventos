import type { Metadata } from 'next';
import AnunciaConNosotros from '@/views/AnunciaConNosotros';

export const metadata: Metadata = {
  title: 'Anuncia con Nosotros | J&M Eventos',
  description: 'Conecta tu marca con miles de familias que planean eventos en Perú. Planes de publicidad y patrocinio en J&M Eventos.',
};

export default function Page() {
  return <AnunciaConNosotros />;
}
