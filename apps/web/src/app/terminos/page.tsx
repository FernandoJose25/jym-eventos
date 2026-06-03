import type { Metadata } from 'next';
import LegalPageClient from '@/components/ui/LegalPageClient';

export const metadata: Metadata = {
  title: 'Términos del Servicio',
  description: 'Términos y condiciones del servicio de J&M Eventos y Decoraciones. Conoce los derechos y obligaciones al contratar nuestros servicios.',
};

const DEFAULT_SECTIONS = [
  { title:'1. Aceptación de los Términos', content:`Al acceder y utilizar este sitio web, así como al contratar cualquiera de nuestros servicios, aceptas quedar vinculado por los presentes Términos del Servicio.` },
  { title:'2. Descripción de los Servicios', content:`J&M Eventos y Decoraciones ofrece los siguientes servicios en Sechura, Piura y zonas aledañas:\n\n• Shows Infantiles con personajes temáticos.\n• Show Hora Loca para eventos y celebraciones.\n• Activaciones Empresariales y marketing experiencial.\n• Catering y Carritos Snacks para todo tipo de evento.\n• Filmación y Fotografía profesional.\n• Decoración Temática personalizada.` },
  { title:'3. Proceso de Contratación', content:`El proceso inicia con una solicitud de cotización. Tras recibir tu solicitud, te enviaremos una propuesta detallada. El contrato se perfecciona con la aceptación expresa de la propuesta y el pago del adelanto acordado (generalmente entre el 30% y el 50% del total).` },
  { title:'4. Precios y Formas de Pago', content:`Todos los precios están expresados en soles peruanos (PEN). Aceptamos transferencia bancaria, depósito en cuenta, Yape, Plin y efectivo. El saldo restante deberá ser cancelado en la fecha acordada en el contrato.` },
  { title:'5. Cancelaciones y Devoluciones', content:`• Cancelaciones con más de 15 días de anticipación: se reembolsará el 80% del adelanto pagado.\n• Cancelaciones entre 8 y 15 días de anticipación: se reembolsará el 50% del adelanto pagado.\n• Cancelaciones con menos de 7 días de anticipación: no habrá reembolso del adelanto.` },
  { title:'6. Fuerza Mayor', content:`No seremos responsables por el incumplimiento cuando sea causado por circunstancias fuera de nuestro control razonable. En estos casos, trabajaremos contigo para buscar una fecha alternativa.` },
  { title:'7. Responsabilidades del Cliente', content:`Al contratar nuestros servicios, el cliente se compromete a:\n\n• Proporcionar información veraz y completa para la planificación del evento.\n• Garantizar el acceso al lugar del evento con la anticipación acordada para la instalación.\n• Respetar a nuestro personal y colaboradores durante el evento.` },
  { title:'8. Propiedad Intelectual', content:`Todo el contenido de este sitio web es propiedad de J&M Eventos y Decoraciones y está protegido por las leyes de propiedad intelectual vigentes en el Perú.` },
  { title:'9. Fotografía y Redes Sociales', content:`Las fotografías y videos del evento pueden ser utilizadas por J&M Eventos y Decoraciones con fines de portafolio y marketing, salvo que el cliente indique expresamente lo contrario por escrito antes del inicio del evento.` },
  { title:'10. Limitación de Responsabilidad', content:`En ningún caso J&M Eventos y Decoraciones será responsable de daños indirectos, incidentales, especiales o consecuentes. Nuestra responsabilidad total no excederá el importe pagado por el servicio en cuestión.` },
  { title:'11. Modificaciones', content:`Nos reservamos el derecho de modificar estos Términos del Servicio en cualquier momento. Los cambios serán publicados en esta página con la fecha de actualización.` },
  { title:'12. Legislación Aplicable', content:`Estos Términos del Servicio se rigen por las leyes de la República del Perú. Cualquier controversia será sometida a los tribunales competentes de la ciudad de Piura, Perú.` },
  { title:'13. Contacto', content:`J&M Eventos y Decoraciones\nSechura, Piura — Perú\n📧 jmdecoracionesyeventossechura@gmail.com\n📞 (+51) 945 203 708` },
];

export default function TerminosPage() {
  return (
    <LegalPageClient
      legalKey="terminos"
      defaultSections={DEFAULT_SECTIONS}
      heroTitle="Términos del"
      heroHighlight="Servicio"
      heroDesc="Última actualización: enero de 2025"
      introText="Por favor, lee atentamente estos Términos del Servicio antes de contratar cualquier servicio de J&M Eventos y Decoraciones. Al hacerlo, aceptas los términos y condiciones descritos a continuación."
      ctaTitle="¿Listo para crear un evento inolvidable?"
      ctaDesc="Contáctanos y recibe una cotización personalizada sin compromiso."
    />
  );
}
