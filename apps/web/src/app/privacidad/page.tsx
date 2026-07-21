import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { pageOpenGraph } from '@/lib/seo';
import LegalPageClient from '@/components/ui/LegalPageClient';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Política de privacidad de J&M Decoraciones y Eventos. Cómo recopilamos, usamos y protegemos tu información personal.',
  alternates: { canonical: `${SITE_URL}/privacidad` },
  openGraph: pageOpenGraph({
    title: 'Política de Privacidad',
    description: 'Política de privacidad de J&M Decoraciones y Eventos. Cómo recopilamos, usamos y protegemos tu información personal.',
    url: `${SITE_URL}/privacidad`,
  }),
};

const DEFAULT_SECTIONS = [
  { title: '1. Responsable del Tratamiento', content: `J&M Decoraciones y Eventos, con sede en Sechura, Piura, Perú, es el responsable del tratamiento de los datos personales que nos proporciones a través de este sitio web, formularios de contacto o cualquier otro medio de comunicación.\n\nCorreo de contacto: jmdecoracionesyeventossechura@gmail.com\nTeléfono: (+51) 945 203 708` },
  { title: '2. Datos que Recopilamos', content: `Podemos recopilar los siguientes tipos de datos personales:\n\n• Nombre completo y datos de identificación.\n• Dirección de correo electrónico y número de teléfono.\n• Información sobre el evento que deseas contratar (fecha, tipo, cantidad de invitados).\n• Datos de navegación (cookies, dirección IP, tipo de navegador) cuando visitas nuestro sitio.\n• Cualquier otra información que nos proporciones voluntariamente al contactarnos.` },
  { title: '3. Finalidad del Tratamiento', content: `Utilizamos tus datos personales para:\n\n• Gestionar y responder a tus consultas y solicitudes de cotización.\n• Planificar y ejecutar los servicios de eventos contratados.\n• Enviarte comunicaciones relacionadas con tu evento o nuestros servicios (con tu consentimiento previo).\n• Mejorar nuestro sitio web y la experiencia del usuario.\n• Cumplir con obligaciones legales y contractuales.` },
  { title: '4. Base Legal del Tratamiento', content: `El tratamiento de tus datos se basa en:\n\n• Tu consentimiento explícito al completar formularios de contacto.\n• La ejecución de un contrato o medidas precontractuales a petición tuya.\n• El cumplimiento de obligaciones legales aplicables.\n• Nuestro interés legítimo en brindar y mejorar nuestros servicios.` },
  { title: '5. Conservación de los Datos', content: `Conservamos tus datos personales durante el tiempo necesario para cumplir con las finalidades para las que fueron recopilados, o durante el tiempo que la ley nos obligue a conservarlos.` },
  { title: '6. Compartición de Datos con Terceros', content: `No vendemos, alquilamos ni cedemos tus datos personales a terceros con fines comerciales. Sin embargo, podemos compartir información con proveedores que nos ayudan a prestar nuestros servicios, únicamente en la medida necesaria.` },
  { title: '7. Tus Derechos', content: `De conformidad con la Ley N.° 29733 (Ley de Protección de Datos Personales del Perú) tienes derecho a acceder, rectificar, cancelar u oponerte al tratamiento de tus datos. Envíanos un correo a jmdecoracionesyeventossechura@gmail.com.` },
  { title: '8. Seguridad de la Información', content: `Implementamos medidas técnicas y organizativas adecuadas para proteger tus datos personales frente a accesos no autorizados, pérdida, alteración o divulgación.` },
  { title: '9. Cookies', content: `Nuestro sitio web utiliza cookies para mejorar tu experiencia de navegación. Puedes gestionar tus preferencias de cookies en cualquier momento.` },
  { title: '10. Cambios en esta Política', content: `Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos publicando la nueva versión en esta página con la fecha de actualización.` },
  { title: '11. Contacto', content: `J&M Decoraciones y Eventos\nSechura, Piura — Perú\n📧 jmdecoracionesyeventossechura@gmail.com\n📞 (+51) 945 203 708` },
];

export default function PrivacidadPage() {
  return (
    <LegalPageClient
      legalKey="privacidad"
      defaultSections={DEFAULT_SECTIONS}
      heroTitle="Política de"
      heroHighlight="Privacidad"
      heroDesc="Última actualización: enero de 2025"
      introText="En J&M Decoraciones y Eventos valoramos y respetamos tu privacidad. Esta política explica cómo recopilamos, usamos y protegemos la información personal que nos proporcionas."
      ctaTitle="¿Tienes alguna pregunta?"
      ctaDesc="Estamos aquí para ayudarte con cualquier duda sobre el tratamiento de tus datos."
    />
  );
}