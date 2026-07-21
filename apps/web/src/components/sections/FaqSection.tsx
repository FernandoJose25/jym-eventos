'use client';
import { useState } from 'react';
import JsonLd from '@/components/ui/JsonLd';
import DividerJM from '@/components/ui/DividerJM';

interface FaqItem { q: string; a: string }

/* Las respuestas dirigen la conversación a WhatsApp a propósito: la web no
   muestra precios ni paquetes cerrados — la cotización se conversa. */
const DEFAULT_ITEMS: FaqItem[] = [
  {
    q: '¿Con cuánta anticipación debo reservar?',
    a: 'Lo ideal es 3 a 4 semanas antes de tu evento. Para fechas de temporada alta (diciembre, día de la madre, fiestas patrias) y quinceaños te recomendamos escribirnos con 2 meses de anticipación: esas fechas se llenan rápido.',
  },
  {
    q: '¿La cotización tiene algún costo?',
    a: 'No, es totalmente gratis y sin compromiso. Cuéntanos por WhatsApp qué evento tienes en mente y te preparamos una propuesta personalizada según lo que necesitas y tu presupuesto.',
  },
  {
    q: '¿Piden adelanto para asegurar la fecha?',
    a: 'Sí, con un adelanto separamos tu fecha en exclusiva; el saldo se cancela el día del evento. Así garantizamos que ese día nuestro equipo esté completo para ti.',
  },
  {
    q: '¿Atienden fuera de Sechura?',
    a: 'Sí, atendemos Sechura, Piura y alrededores. Escríbenos por WhatsApp con tu distrito y te confirmamos la cobertura de inmediato.',
  },
  {
    q: '¿Puedo combinar varios servicios?',
    a: 'Claro, es lo más común: show + decoración + catering + fotografía en un solo evento con un solo equipo coordinando todo. Cuéntanos tu idea y armamos la combinación perfecta para tu celebración.',
  },
  {
    q: '¿Qué necesitan saber para cotizar?',
    a: 'Solo tres cosas: tipo de evento, fecha tentativa y cantidad aproximada de invitados. Con eso te respondemos en menos de 2 horas en horario de atención.',
  },
];

export default function FaqSection({ data }: { data?: Record<string, any> | null }) {
  const items: FaqItem[] = (data?.items?.length ? data.items : DEFAULT_ITEMS)
    .filter((it: any) => it?.q && it?.a);
  const [open, setOpen] = useState<number | null>(0);

  if (!items.length) return null;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(it => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };

  return (
    <section id="preguntas-frecuentes" style={{
      padding: '6rem 0', background: '#0a1628', position: 'relative', overflow: 'hidden',
    }}>
      <JsonLd data={faqSchema} />

      {/* Resplandor decorativo */}
      <div style={{
        position: 'absolute', top: -180, left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse,rgba(212,160,23,0.07) 0%,transparent 65%)', pointerEvents: 'none',
      }} />

      <div className="container" style={{ position: 'relative', maxWidth: 860 }}>
        <DividerJM tone="dark" />

        <div className="reveal" style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: '1rem',
            padding: '0.4rem 1.5rem', borderRadius: 9999,
            background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.25)',
            color: '#f5c842', fontSize: '0.75rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.12em',
          }}>
            💬 {data?.eyebrow || 'Preguntas frecuentes'}
          </span>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem,3.5vw,2.6rem)' }}>
            {data?.titulo || 'Resolvemos tus'}{' '}
            <em style={{ color: '#f5c842', fontStyle: 'italic' }}>{data?.tituloAccent || 'dudas'}</em>
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className={`reveal stagger-${Math.min(i + 1, 8)}`} style={{
                borderRadius: 16,
                background: isOpen ? 'rgba(212,160,23,0.06)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isOpen ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.08)'}`,
                transition: 'background .35s, border-color .35s',
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 14, padding: '1.15rem 1.4rem', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    color: isOpen ? '#f5c842' : 'rgba(255,255,255,0.88)',
                    fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '0.98rem',
                    transition: 'color .3s',
                  }}>
                  {it.q}
                  <span aria-hidden="true" style={{
                    flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
                    border: '1px solid rgba(212,160,23,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#f5c842', fontSize: '1rem', lineHeight: 1,
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
                    transition: 'transform .35s cubic-bezier(.16,1,.3,1)',
                  }}>+</span>
                </button>
                {/* Apertura/cierre con grid-template-rows: altura fluida real
                    (no max-height tosco) + fundido y leve descenso del texto.
                    Solo una abierta a la vez: `open` guarda un único índice. */}
                <div style={{
                  display: 'grid',
                  gridTemplateRows: isOpen ? '1fr' : '0fr',
                  transition: 'grid-template-rows .55s cubic-bezier(.22,1,.36,1)',
                }}>
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{
                      padding: '0 1.4rem 1.25rem', margin: 0,
                      color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.75,
                      opacity: isOpen ? 1 : 0,
                      transform: isOpen ? 'translateY(0)' : 'translateY(-6px)',
                      transition: isOpen
                        ? 'opacity .5s cubic-bezier(.22,1,.36,1) .12s, transform .5s cubic-bezier(.22,1,.36,1) .12s'
                        : 'opacity .25s ease, transform .25s ease',
                    }}>
                      {it.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toda duda que no esté aquí termina en WhatsApp — es el embudo del negocio */}
        <div className="reveal" style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            ¿Tienes otra pregunta?
          </p>
          <a href="https://wa.me/51945203708?text=Hola%2C%20tengo%20una%20consulta%20sobre%20sus%20servicios"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.9rem 2rem',
              borderRadius: 9999, background: 'linear-gradient(135deg,#b8860b,#f5c842)',
              color: '#0a1628', fontWeight: 700, fontSize: '0.92rem', textDecoration: 'none',
              boxShadow: '0 6px 22px rgba(212,160,23,0.35)',
              transition: 'transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 14px 36px rgba(212,160,23,0.5)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 6px 22px rgba(212,160,23,0.35)'; }}>
            💬 Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
