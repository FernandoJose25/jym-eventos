import type { Metadata } from 'next';
import ContactoClient from './ContactoClient';

export const metadata: Metadata = {
  title: 'Contacto y Cotizaciones | J&M Eventos',
  description: 'Cotiza tu evento en Sechura, Piura. Respuesta rápida por WhatsApp. Shows, decoración, catering, quinceaños y paquetes completos.',
};

export default function Page() {
  return <ContactoClient />;
}
