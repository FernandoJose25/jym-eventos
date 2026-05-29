import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description: 'Política de cookies de J&M Eventos y Decoraciones. Qué cookies usamos, para qué sirven y cómo puedes gestionarlas.',
};

const cookieTypes = [
  {
    name: 'Cookies Esenciales',
    icon: '🔒',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    desc: 'Son imprescindibles para el funcionamiento básico del sitio web. Sin ellas, ciertas funciones no podrían ejecutarse correctamente.',
    examples: ['Gestión de sesión de usuario', 'Preferencias de accesibilidad', 'Protección contra ataques CSRF'],
    canDisable: false,
  },
  {
    name: 'Cookies Analíticas',
    icon: '📊',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
    desc: 'Nos permiten analizar cómo los visitantes utilizan el sitio web para mejorar su funcionamiento y contenido.',
    examples: ['Google Analytics — visitas y páginas vistas', 'Tiempo de permanencia en el sitio', 'Fuentes de tráfico y origen de visitantes'],
    canDisable: true,
  },
  {
    name: 'Cookies de Preferencias',
    icon: '⚙️',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    desc: 'Recuerdan tus preferencias y configuraciones para ofrecerte una experiencia más personalizada.',
    examples: ['Idioma preferido', 'Región geográfica seleccionada', 'Configuración de visualización'],
    canDisable: true,
  },
  {
    name: 'Cookies de Marketing',
    icon: '📣',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
    desc: 'Se utilizan para mostrarte publicidad relevante y medir la efectividad de nuestras campañas.',
    examples: ['Facebook Pixel', 'Remarketing de Google', 'Seguimiento de conversiones'],
    canDisable: true,
  },
];

const sections = [
  {
    title: '1. ¿Qué son las Cookies?',
    content: `Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo (ordenador, teléfono móvil o tableta) cuando los visitas. Sirven para que el sitio recuerde información sobre tu visita, como tu idioma preferido u otras opciones de configuración, lo que puede facilitar tu próxima visita y hacer que el sitio te resulte más útil.`,
  },
  {
    title: '2. ¿Qué Cookies Utilizamos?',
    content: null,
  },
  {
    title: '3. Cookies de Terceros',
    content: `Algunos servicios de terceros integrados en nuestro sitio pueden instalar sus propias cookies. Entre ellos:

• Google Analytics: para analizar el tráfico web y el comportamiento de los usuarios.
• Google Maps: para mostrar mapas interactivos con nuestra ubicación.
• Facebook Pixel: para medir el rendimiento de nuestros anuncios en Facebook e Instagram.
• YouTube: para reproducir videos incrustados en el sitio.

Estos terceros tienen sus propias políticas de privacidad y cookies, sobre las que J&M Eventos no tiene control directo.`,
  },
  {
    title: '4. Duración de las Cookies',
    content: `Según su duración, las cookies pueden ser:

• Cookies de sesión: se eliminan automáticamente cuando cierras el navegador. Sirven para mantener la coherencia durante una misma visita.

• Cookies persistentes: permanecen en tu dispositivo durante un período determinado (desde unas horas hasta varios años) o hasta que las elimines manualmente. Se usan para recordar preferencias entre visitas.`,
  },
  {
    title: '5. Cómo Gestionar tus Cookies',
    content: `Puedes gestionar las cookies directamente desde la configuración de tu navegador. A continuación te indicamos cómo hacerlo en los principales navegadores:

• Google Chrome: Configuración → Privacidad y seguridad → Cookies y otros datos de sitios.
• Mozilla Firefox: Opciones → Privacidad y seguridad → Cookies y datos del sitio.
• Safari: Preferencias → Privacidad → Gestionar datos de sitios web.
• Microsoft Edge: Configuración → Privacidad, búsqueda y servicios → Cookies.

Ten en cuenta que deshabilitar ciertas cookies puede afectar la funcionalidad del sitio web y tu experiencia de navegación.`,
  },
  {
    title: '6. Consentimiento',
    content: `La primera vez que visitas nuestro sitio web, te mostramos un aviso de cookies donde puedes aceptar o rechazar las cookies no esenciales. Puedes cambiar tus preferencias en cualquier momento contactándonos o borrando las cookies de tu navegador.

Tu consentimiento para el uso de cookies es completamente voluntario. Solo las cookies estrictamente necesarias se instalarán sin tu consentimiento previo.`,
  },
  {
    title: '7. Actualizaciones de esta Política',
    content: `Podemos actualizar esta Política de Cookies en función de cambios en nuestros servicios o en la legislación aplicable. Te recomendamos revisarla periódicamente. La fecha de la última actualización aparece al inicio de este documento.`,
  },
  {
    title: '8. Contacto',
    content: `Si tienes alguna pregunta sobre nuestra Política de Cookies, puedes contactarnos en:

J&M Eventos y Decoraciones
Sechura, Piura — Perú
📧 jmdecoracionesyeventossechura@gmail.com
📞 (+51) 945 203 708`,
  },
];

export default function CookiesPage() {
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
            }}>Cookies</span>
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
            Esta política explica qué son las cookies, qué tipos utilizamos en nuestro sitio web y cómo puedes controlar su uso. Al navegar por nuestro sitio, aceptas el uso de cookies conforme a lo descrito aquí.
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

              {sec.content ? (
                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.85, whiteSpace: 'pre-line', margin: 0 }}>
                  {sec.content}
                </p>
              ) : (
                /* Grid de tipos de cookies */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: '1rem', marginTop: '1rem' }}>
                  {cookieTypes.map((ct, j) => (
                    <div key={j} style={{
                      padding: '1.5rem', borderRadius: 16,
                      background: ct.bg, border: `1px solid ${ct.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '1.4rem' }}>{ct.icon}</span>
                        <div>
                          <p style={{ fontWeight: 700, color: '#0a1628', fontSize: '0.95rem', margin: 0, fontFamily: 'var(--font-playfair)' }}>{ct.name}</p>
                          <span style={{
                            display: 'inline-block', fontSize: '0.62rem', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '.1em', padding: '1px 8px',
                            borderRadius: 9999, marginTop: 2,
                            background: ct.canDisable ? 'rgba(100,116,139,0.12)' : 'rgba(16,185,129,0.12)',
                            color: ct.canDisable ? '#64748b' : '#059669',
                          }}>
                            {ct.canDisable ? 'Opcional' : 'Siempre activa'}
                          </span>
                        </div>
                      </div>
                      <p style={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.65, margin: '0 0 0.75rem' }}>
                        {ct.desc}
                      </p>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {ct.examples.map((ex, k) => (
                          <li key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>
                            <span style={{ color: ct.color, fontSize: '0.6rem', marginTop: 4, flexShrink: 0 }}>▶</span>
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div style={{ marginTop: '4rem', padding: '2rem', background: 'linear-gradient(135deg,rgba(212,160,23,0.08),rgba(212,160,23,0.03))', border: '1px solid rgba(212,160,23,0.2)', borderRadius: 16, textAlign: 'center' }}>
            <p style={{ color: '#0a1628', fontWeight: 700, fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', margin: '0 0 0.5rem' }}>¿Tienes alguna pregunta?</p>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>Estamos disponibles para resolver cualquier duda sobre el uso de cookies en nuestro sitio.</p>
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
