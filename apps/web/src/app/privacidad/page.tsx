import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Política de privacidad de J&M Eventos y Decoraciones. Cómo recopilamos, usamos y protegemos tu información personal.',
};

const sections = [
  {
    title: '1. Responsable del Tratamiento',
    content: `J&M Eventos y Decoraciones, con sede en Sechura, Piura, Perú, es el responsable del tratamiento de los datos personales que nos proporciones a través de este sitio web, formularios de contacto o cualquier otro medio de comunicación.

Correo de contacto: jmdecoracionesyeventossechura@gmail.com
Teléfono: (+51) 945 203 708`,
  },
  {
    title: '2. Datos que Recopilamos',
    content: `Podemos recopilar los siguientes tipos de datos personales:

• Nombre completo y datos de identificación.
• Dirección de correo electrónico y número de teléfono.
• Información sobre el evento que deseas contratar (fecha, tipo, cantidad de invitados).
• Datos de navegación (cookies, dirección IP, tipo de navegador) cuando visitas nuestro sitio.
• Cualquier otra información que nos proporciones voluntariamente al contactarnos.`,
  },
  {
    title: '3. Finalidad del Tratamiento',
    content: `Utilizamos tus datos personales para:

• Gestionar y responder a tus consultas y solicitudes de cotización.
• Planificar y ejecutar los servicios de eventos contratados.
• Enviarte comunicaciones relacionadas con tu evento o nuestros servicios (con tu consentimiento previo).
• Mejorar nuestro sitio web y la experiencia del usuario.
• Cumplir con obligaciones legales y contractuales.`,
  },
  {
    title: '4. Base Legal del Tratamiento',
    content: `El tratamiento de tus datos se basa en:

• Tu consentimiento explícito al completar formularios de contacto.
• La ejecución de un contrato o medidas precontractuales a petición tuya.
• El cumplimiento de obligaciones legales aplicables.
• Nuestro interés legítimo en brindar y mejorar nuestros servicios.`,
  },
  {
    title: '5. Conservación de los Datos',
    content: `Conservamos tus datos personales durante el tiempo necesario para cumplir con las finalidades para las que fueron recopilados, o durante el tiempo que la ley nos obligue a conservarlos. Una vez concluida la relación contractual o finalizado el período legal de conservación, tus datos serán eliminados o anonimizados de forma segura.`,
  },
  {
    title: '6. Compartición de Datos con Terceros',
    content: `No vendemos, alquilamos ni cedemos tus datos personales a terceros con fines comerciales. Sin embargo, podemos compartir información con:

• Proveedores y colaboradores que nos ayudan a prestar nuestros servicios (fotógrafos, animadores, proveedores de catering), únicamente en la medida necesaria.
• Autoridades competentes cuando así lo exija la ley.

Todos nuestros colaboradores están obligados a tratar tus datos con la misma confidencialidad y seguridad que nosotros.`,
  },
  {
    title: '7. Tus Derechos',
    content: `De conformidad con la Ley N.° 29733 (Ley de Protección de Datos Personales del Perú) y su reglamento, tienes derecho a:

• Acceder a tus datos personales que obran en nuestros registros.
• Rectificar datos inexactos o incompletos.
• Cancelar o solicitar la eliminación de tus datos cuando ya no sean necesarios.
• Oponerte al tratamiento de tus datos para determinadas finalidades.

Para ejercer cualquiera de estos derechos, envíanos un correo a jmdecoracionesyeventossechura@gmail.com indicando tu solicitud.`,
  },
  {
    title: '8. Seguridad de la Información',
    content: `Implementamos medidas técnicas y organizativas adecuadas para proteger tus datos personales frente a accesos no autorizados, pérdida, alteración o divulgación. Revisamos y actualizamos periódicamente nuestras prácticas de seguridad.`,
  },
  {
    title: '9. Cookies',
    content: `Nuestro sitio web utiliza cookies para mejorar tu experiencia de navegación. Puedes gestionar tus preferencias de cookies en cualquier momento. Consulta nuestra Política de Cookies para más información.`,
  },
  {
    title: '10. Cambios en esta Política',
    content: `Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos de cambios significativos publicando la nueva versión en esta página con la fecha de actualización correspondiente. Te recomendamos revisar esta política periódicamente.`,
  },
  {
    title: '11. Contacto',
    content: `Si tienes preguntas, dudas o comentarios sobre esta Política de Privacidad o sobre el tratamiento de tus datos personales, no dudes en contactarnos:

J&M Eventos y Decoraciones
Sechura, Piura — Perú
📧 jmdecoracionesyeventossechura@gmail.com
📞 (+51) 945 203 708`,
  },
];

export default function PrivacidadPage() {
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
            Política de{' '}
            <span style={{
              background: 'linear-gradient(135deg,#b8860b 0%,#f5c842 40%,#b8860b 80%)',
              backgroundSize: '200% auto', WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontStyle: 'italic',
            }}>Privacidad</span>
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
            En J&M Eventos y Decoraciones valoramos y respetamos tu privacidad. Esta política explica cómo recopilamos, usamos y protegemos la información personal que nos proporcionas.
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
            <p style={{ color: '#0a1628', fontWeight: 700, fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', margin: '0 0 0.5rem' }}>¿Tienes alguna pregunta?</p>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>Estamos aquí para ayudarte con cualquier duda sobre el tratamiento de tus datos.</p>
            <a href="/contacto" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0.75rem 2rem', borderRadius: 9999,
              background: 'linear-gradient(135deg,#b8860b,#f5c842)', color: '#0a1628',
              fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
            }}>
              Contáctanos →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
