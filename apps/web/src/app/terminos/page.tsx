import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos del Servicio',
  description: 'Términos y condiciones del servicio de J&M Eventos y Decoraciones. Conoce los derechos y obligaciones al contratar nuestros servicios.',
};

const sections = [
  {
    title: '1. Aceptación de los Términos',
    content: `Al acceder y utilizar este sitio web, así como al contratar cualquiera de nuestros servicios, aceptas quedar vinculado por los presentes Términos del Servicio. Si no estás de acuerdo con alguno de estos términos, te pedimos que no utilices nuestros servicios ni este sitio web.`,
  },
  {
    title: '2. Descripción de los Servicios',
    content: `J&M Eventos y Decoraciones ofrece los siguientes servicios en Sechura, Piura y zonas aledañas:

• Shows Infantiles con personajes temáticos.
• Show Hora Loca para eventos y celebraciones.
• Activaciones Empresariales y marketing experiencial.
• Catering y Carritos Snacks para todo tipo de evento.
• Filmación y Fotografía profesional.
• Decoración Temática personalizada.

La disponibilidad de cada servicio está sujeta a la fecha, zona geográfica y capacidad operativa del momento.`,
  },
  {
    title: '3. Proceso de Contratación',
    content: `3.1. El proceso de contratación inicia con una solicitud de cotización a través de nuestro formulario de contacto, WhatsApp o correo electrónico.

3.2. Tras recibir tu solicitud, te enviaremos una propuesta detallada con los servicios, condiciones y precio correspondiente.

3.3. El contrato se perfecciona con la aceptación expresa de la propuesta y el pago del adelanto acordado (generalmente entre el 30% y el 50% del total).

3.4. Nos reservamos el derecho de rechazar solicitudes que no se ajusten a nuestra capacidad operativa o valores empresariales.`,
  },
  {
    title: '4. Precios y Formas de Pago',
    content: `4.1. Todos los precios están expresados en soles peruanos (PEN) e incluyen los impuestos aplicables, salvo indicación contraria.

4.2. Aceptamos los siguientes medios de pago: transferencia bancaria, depósito en cuenta, Yape, Plin y efectivo.

4.3. El precio final acordado en la cotización es el precio definitivo del servicio. Cualquier modificación posterior podrá implicar un ajuste en el precio.

4.4. El saldo restante deberá ser cancelado en la fecha y forma acordadas en el contrato, normalmente antes o el mismo día del evento.`,
  },
  {
    title: '5. Cancelaciones y Devoluciones',
    content: `5.1. Las cancelaciones deben comunicarse por escrito con un mínimo de 7 días de anticipación a la fecha del evento.

5.2. Cancelaciones con más de 15 días de anticipación: se reembolsará el 80% del adelanto pagado.

5.3. Cancelaciones entre 8 y 15 días de anticipación: se reembolsará el 50% del adelanto pagado.

5.4. Cancelaciones con menos de 7 días de anticipación: no habrá reembolso del adelanto, ya que los costos de preparación ya habrán sido incurridos.

5.5. En caso de cancelación por nuestra parte por motivos imputables a J&M Eventos (excepto fuerza mayor), se reembolsará el 100% de los pagos recibidos.`,
  },
  {
    title: '6. Fuerza Mayor',
    content: `No seremos responsables por el incumplimiento o retraso en la prestación de servicios cuando este sea causado por circunstancias fuera de nuestro control razonable, incluyendo pero no limitado a: desastres naturales, epidemias, actos de autoridad pública, cortes de energía o eventos similares.

En estos casos, trabajaremos contigo para buscar una fecha alternativa o acordar las condiciones más favorables posibles.`,
  },
  {
    title: '7. Responsabilidades del Cliente',
    content: `Al contratar nuestros servicios, el cliente se compromete a:

• Proporcionar información veraz y completa para la planificación del evento.
• Garantizar el acceso al lugar del evento con la anticipación acordada para la instalación y montaje.
• Asegurarse de que el lugar del evento cumpla con los requisitos necesarios para los servicios contratados.
• Respetar a nuestro personal y colaboradores durante el evento.
• Cubrir cualquier daño material causado a nuestro equipo o materiales por negligencia o mal uso.`,
  },
  {
    title: '8. Propiedad Intelectual',
    content: `Todo el contenido de este sitio web —incluyendo textos, imágenes, videos, logotipos y diseños— es propiedad de J&M Eventos y Decoraciones o de sus respectivos titulares de derechos, y está protegido por las leyes de propiedad intelectual vigentes en el Perú.

Queda prohibida la reproducción, distribución o uso comercial de cualquier contenido sin autorización expresa y escrita de J&M Eventos y Decoraciones.`,
  },
  {
    title: '9. Fotografía y Redes Sociales',
    content: `Las fotografías y videos del evento pueden ser utilizadas por J&M Eventos y Decoraciones con fines de portafolio y marketing, salvo que el cliente indique expresamente lo contrario por escrito antes del inicio del evento.

En tal caso, respetaremos tu solicitud y no publicaremos imágenes del evento en nuestras plataformas.`,
  },
  {
    title: '10. Limitación de Responsabilidad',
    content: `En ningún caso J&M Eventos y Decoraciones será responsable de daños indirectos, incidentales, especiales o consecuentes derivados del uso de nuestros servicios. Nuestra responsabilidad total no excederá el importe pagado por el servicio en cuestión.`,
  },
  {
    title: '11. Modificaciones',
    content: `Nos reservamos el derecho de modificar estos Términos del Servicio en cualquier momento. Los cambios serán publicados en esta página con la fecha de actualización. El uso continuado de nuestros servicios tras la publicación de cambios implica la aceptación de los nuevos términos.`,
  },
  {
    title: '12. Legislación Aplicable y Jurisdicción',
    content: `Estos Términos del Servicio se rigen por las leyes de la República del Perú. Cualquier controversia derivada de la interpretación o ejecución de estos términos será sometida a los tribunales competentes de la ciudad de Piura, Perú.`,
  },
  {
    title: '13. Contacto',
    content: `Para consultas relacionadas con estos Términos del Servicio, puedes contactarnos en:

J&M Eventos y Decoraciones
Sechura, Piura — Perú
📧 jmdecoracionesyeventossechura@gmail.com
📞 (+51) 945 203 708`,
  },
];

export default function TerminosPage() {
  return (
    <>
      {/* Hero */}
      <section style={{
        minHeight: '40vh', display: 'flex', alignItems: 'center',
        background: 'radial-gradient(ellipse 100% 80% at 50% 30%, #0f2044 0%, #050d1a 55%, #000 100%)',
        position: 'relative', overflow: 'hidden', paddingTop: 80,
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)', backgroundSize: '80px 80px', pointerEvents: 'none' }}/>
        <div className="container" style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '4rem 1.5rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0.4rem 1.25rem', borderRadius: 9999,
            background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)',
            color: '#d4a017', fontSize: '0.68rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.22em', marginBottom: '1.25rem',
          }}>
            ✦ Legal
          </span>
          <h1 style={{
            fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2.5rem,5vw,4rem)',
            color: '#fff', lineHeight: 1.1, fontWeight: 700, margin: '0 0 1rem',
          }}>
            Términos del{' '}
            <span style={{
              background: 'linear-gradient(135deg,#b8860b 0%,#f5c842 40%,#b8860b 80%)',
              backgroundSize: '200% auto', WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontStyle: 'italic',
            }}>Servicio</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', margin: 0 }}>
            Última actualización: enero de 2025
          </p>
        </div>
      </section>

      {/* Contenido */}
      <section style={{ background: '#fff', padding: '5rem 0 7rem' }}>
        <div className="container" style={{ maxWidth: 800, margin: '0 auto', padding: '0 1.5rem' }}>
          <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.85, marginBottom: '3rem', padding: '1.5rem 2rem', background: '#f8fafc', borderLeft: '4px solid #d4a017', borderRadius: '0 12px 12px 0' }}>
            Por favor, lee atentamente estos Términos del Servicio antes de contratar cualquier servicio de J&M Eventos y Decoraciones. Al hacerlo, aceptas los términos y condiciones descritos a continuación.
          </p>

          {sections.map((sec, i) => (
            <div key={i} style={{ marginBottom: '2.5rem' }}>
              <h2 style={{
                fontFamily: 'var(--font-playfair)', fontSize: '1.35rem', color: '#0a1628',
                fontWeight: 700, marginBottom: '0.875rem',
                paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0',
              }}>
                {sec.title}
              </h2>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.85, whiteSpace: 'pre-line', margin: 0 }}>
                {sec.content}
              </p>
            </div>
          ))}

          <div style={{ marginTop: '4rem', padding: '2rem', background: 'linear-gradient(135deg,rgba(212,160,23,0.08),rgba(212,160,23,0.03))', border: '1px solid rgba(212,160,23,0.2)', borderRadius: 16, textAlign: 'center' }}>
            <p style={{ color: '#0a1628', fontWeight: 700, fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', margin: '0 0 0.5rem' }}>¿Listo para crear un evento inolvidable?</p>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>Contáctanos y recibe una cotización personalizada sin compromiso.</p>
            <a href="/contacto" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0.75rem 2rem', borderRadius: 9999,
              background: 'linear-gradient(135deg,#b8860b,#f5c842)', color: '#0a1628',
              fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
            }}>
              Cotizar mi evento →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
