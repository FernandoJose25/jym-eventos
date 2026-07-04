import type { Metadata } from 'next';
import SobreNosotrosClient from './SobreNosotrosClient';

export const metadata: Metadata = {
  title: 'Nuestra Historia | J&M Eventos y Decoraciones',
  description: 'Más de 10 años creando experiencias inolvidables en Sechura, Piura. Conoce nuestra trayectoria, valores y equipo.',
};

export default function Page() {
  return <SobreNosotrosClient />;
}
