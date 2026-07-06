import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import LegalPageClient from '@/components/ui/LegalPageClient';

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description: 'Política de cookies de J&M Eventos y Decoraciones. Qué cookies usamos, para qué sirven y cómo puedes gestionarlas.',
  alternates: { canonical: `${SITE_URL}/cookies` },
};

const DEFAULT_SECTIONS = [
  { title: '1. ¿Qué son las cookies?', content: `Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web. Nos permiten recordar tus preferencias y mejorar tu experiencia de navegación.` },
  { title: '2. Tipos de cookies que usamos', content: `• Cookies Esenciales: imprescindibles para el funcionamiento básico del sitio.\n• Cookies Analíticas: nos permiten analizar cómo los visitantes utilizan el sitio (Google Analytics).\n• Cookies de Preferencias: recuerdan tus configuraciones para una experiencia personalizada.\n• Cookies de Marketing: utilizadas para mostrarte publicidad relevante según tus intereses.` },
  { title: '3. Cookies de Terceros', content: `Utilizamos servicios de terceros que pueden instalar sus propias cookies:\n\n• Google Analytics (análisis de tráfico web)\n• Google Maps (mapa de ubicación en la página de contacto)\n• Meta Pixel / Facebook (seguimiento de conversiones y publicidad)\n• WhatsApp Chat Widget (botón de contacto directo)` },
  { title: '4. Cómo gestionar las cookies', content: `Puedes controlar y/o eliminar cookies según lo desees. Puedes eliminar todas las cookies que ya están en tu dispositivo y configurar la mayoría de los navegadores para que no se acepten cookies.\n\nSin embargo, si lo haces, es posible que tengas que ajustar manualmente algunas preferencias cada vez que visites el sitio, y que algunos servicios y funcionalidades no funcionen correctamente.` },
  { title: '5. Tiempo de conservación', content: `Las cookies de sesión se eliminan cuando cierras el navegador. Las cookies persistentes tienen una duración variable según su finalidad, que puede ir desde un día hasta dos años. Puedes ver y eliminar las cookies en cualquier momento desde la configuración de tu navegador.` },
  { title: '6. Cambios en la política de cookies', content: `Podemos actualizar esta Política de Cookies para reflejar cambios en nuestras prácticas. Te notificaremos de cambios significativos publicando la nueva versión en esta página.` },
  { title: '7. Contacto', content: `Para cualquier consulta sobre el uso de cookies en nuestro sitio, contáctanos:\n\nJ&M Eventos y Decoraciones\nSechura, Piura — Perú\n📧 jmdecoracionesyeventossechura@gmail.com\n📞 (+51) 945 203 708` },
];

export default function CookiesPage() {
  return (
    <LegalPageClient
      legalKey="cookies"
      defaultSections={DEFAULT_SECTIONS}
      heroTitle="Política de"
      heroHighlight="Cookies"
      heroDesc="Última actualización: enero de 2025"
      introText="En J&M Eventos y Decoraciones utilizamos cookies para mejorar tu experiencia de navegación. Esta política explica qué cookies usamos, para qué sirven y cómo puedes gestionarlas."
      ctaTitle="¿Tienes dudas sobre las cookies?"
      ctaDesc="Contáctanos si quieres más información sobre cómo gestionamos tus datos de navegación."
    />
  );
}