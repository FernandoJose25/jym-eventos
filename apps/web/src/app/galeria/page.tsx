import type { Metadata } from 'next';
import GaleriaClient from './GaleriaClient';

export const metadata: Metadata = {
  title: 'Galería de Eventos | J&M Eventos y Decoraciones',
  description: 'Fotos y videos reales de shows infantiles, decoración temática, quinceaños y eventos corporativos realizados en Sechura, Piura.',
};

export default function Page() {
  return <GaleriaClient />;
}
