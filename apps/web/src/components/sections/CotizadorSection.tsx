'use client';
import { useState } from 'react';
import DividerJM from '@/components/ui/DividerJM';

/* Cotizador guiado: el visitante elige tipo → fecha → invitados en 3 pasos y
   el botón final abre WhatsApp con el mensaje ya redactado. No muestra precios
   a propósito — la cotización se conversa por WhatsApp (decisión comercial de
   J&M). El objetivo es reducir la fricción: mucha gente no escribe porque no
   sabe "qué decir", y esto se lo redacta, dejando además una consulta ya
   calificada (tipo, fecha, tamaño) antes de responder. */

interface Servicio { id: string; title: string; icon: string }

const FECHAS = [
  { emoji: '📅', label: 'Este mes', frase: 'este mes' },
  { emoji: '🗓️', label: 'En 1–2 meses', frase: 'en 1 o 2 meses' },
  { emoji: '⏳', label: 'Más adelante', frase: 'en 3 meses o más' },
  { emoji: '🤔', label: 'Aún sin fecha', frase: 'aún sin fecha definida' },
];

const INVITADOS = [
  { label: 'Menos de 30', frase: 'menos de 30 invitados' },
  { label: '30 – 60', frase: 'entre 30 y 60 invitados' },
  { label: '60 – 100', frase: 'entre 60 y 100 invitados' },
  { label: 'Más de 100', frase: 'más de 100 invitados' },
];

const WA = '51945203708';

// Íconos genéricos si un servicio no define emoji propio, para que el paso 1
// siempre se vea completo aunque el admin no haya puesto icono.
const FALLBACK_ICON = '🎉';

export default function CotizadorSection({ services = [] }: { services?: Servicio[] }) {
  const [step, setStep] = useState(0);
  const [tipo, setTipo] = useState('');
  const [fecha, setFecha] = useState('');
  const [invitados, setInvitados] = useState('');

  // Opciones del paso 1: los servicios reales visibles; si no hay, un set base.
  const tipos = services.length > 0
    ? services.slice(0, 6).map(s => ({ label: s.title, frase: s.title.toLowerCase(), emoji: s.icon || FALLBACK_ICON }))
    : [
        { label: 'Cumpleaños', frase: 'un cumpleaños', emoji: '🎂' },
        { label: 'Quinceaños', frase: 'un quinceaños', emoji: '👑' },
        { label: 'Boda', frase: 'una boda', emoji: '💍' },
        { label: 'Evento corporativo', frase: 'un evento corporativo', emoji: '🏢' },
      ];

  const pick = (idx: 0 | 1 | 2, frase: string, setter: (v: string) => void) => {
    setter(frase);
    // Pequeño respiro para que se vea la selección antes de avanzar
    setTimeout(() => setStep(idx + 1), 320);
  };

  const reset = () => { setStep(0); setTipo(''); setFecha(''); setInvitados(''); };

  const mensaje = `Hola J&M 👋 Quiero cotizar ${tipo} para ${fecha}, con ${invitados}. ¿Me ayudan?`;
  const waHref = `https://wa.me/${WA}?text=${encodeURIComponent(mensaje)}`;

  const stepData = [
    { titulo: '¿Qué vas a celebrar?', opciones: tipos, onPick: (f: string) => pick(0, f, setTipo) },
    { titulo: '¿Para cuándo es?', opciones: FECHAS, onPick: (f: string) => pick(1, f, setFecha) },
    { titulo: '¿Cuántos invitados aprox.?', opciones: INVITADOS, onPick: (f: string) => pick(2, f, setInvitados) },
  ];

  return (
    <section id="cotiza" style={{
      padding: '6rem 0', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg,#050d1a 0%,#0a1628 50%,#0d1f3c 100%)',
    }}>
      {/* Resplandor decorativo */}
      <div style={{
        position: 'absolute', top: -160, right: '-10%', width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(212,160,23,0.08) 0%,transparent 65%)', pointerEvents: 'none',
      }} />

      <div className="container" style={{ position: 'relative', maxWidth: 720 }}>
        <DividerJM tone="dark" />

        <div className="reveal" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: '1rem',
            padding: '0.4rem 1.5rem', borderRadius: 9999,
            background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.25)',
            color: '#f5c842', fontSize: '0.75rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.12em',
          }}>
            ✨ Cotiza en 3 pasos
          </span>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem,3.5vw,2.6rem)' }}>
            Arma tu <em style={{ color: '#f5c842', fontStyle: 'italic' }}>evento</em>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', maxWidth: 440, margin: '0.9rem auto 0' }}>
            Tres toques y te preparamos el mensaje para escribirnos. Sin compromiso.
          </p>
        </div>

        <div className="reveal" style={{
          borderRadius: 24, padding: 'clamp(1.5rem,4vw,2.5rem)',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>
          {/* Indicador de progreso */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: '1.8rem' }}>
            {[0, 1, 2].map(i => (
              <span key={i} aria-hidden="true" style={{
                height: 6, borderRadius: 9999,
                width: i === step ? 30 : 8,
                background: i <= step ? 'linear-gradient(90deg,#b8860b,#f5c842)' : 'rgba(255,255,255,0.15)',
                transition: 'all .4s cubic-bezier(.16,1,.3,1)',
              }} />
            ))}
          </div>

          {step < 3 ? (
            <div key={step} style={{ animation: 'cotFade .45s cubic-bezier(.16,1,.3,1)' }}>
              <p style={{
                textAlign: 'center', color: '#fff', fontFamily: 'var(--font-playfair)',
                fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.4rem',
              }}>
                {stepData[step].titulo}
              </p>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
              }} className="cot-opts">
                {stepData[step].opciones.map((op: any, i: number) => (
                  <button key={i} onClick={() => stepData[step].onPick(op.frase)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '1rem 1.1rem', borderRadius: 14, cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-jakarta)',
                      fontWeight: 600, fontSize: '0.92rem', textAlign: 'left',
                      transition: 'all .25s cubic-bezier(.16,1,.3,1)',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget;
                      el.style.borderColor = 'rgba(212,160,23,0.5)';
                      el.style.background = 'rgba(212,160,23,0.1)';
                      el.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget;
                      el.style.borderColor = 'rgba(255,255,255,0.12)';
                      el.style.background = 'rgba(255,255,255,0.05)';
                      el.style.transform = '';
                    }}>
                    {op.emoji && <span style={{ fontSize: '1.35rem', flexShrink: 0 }}>{op.emoji}</span>}
                    <span>{op.label}</span>
                  </button>
                ))}
              </div>

              {step > 0 && (
                <button onClick={() => setStep(step - 1)}
                  style={{
                    display: 'block', margin: '1.4rem auto 0', background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', cursor: 'pointer',
                    fontFamily: 'var(--font-jakarta)',
                  }}>
                  ← Atrás
                </button>
              )}
            </div>
          ) : (
            <div style={{ animation: 'cotFade .45s cubic-bezier(.16,1,.3,1)', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 1.2rem',
                background: 'linear-gradient(135deg,rgba(212,160,23,0.25),rgba(212,160,23,0.06))',
                border: '1px solid rgba(212,160,23,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
                animation: 'cotPop .5s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
                ✨
              </div>
              <p style={{ color: '#fff', fontFamily: 'var(--font-playfair)', fontSize: '1.3rem', margin: '0 0 0.9rem' }}>
                ¡Listo! Este es tu mensaje
              </p>
              <div style={{
                background: 'rgba(37,211,102,0.08)', border: '1px dashed rgba(37,211,102,0.4)',
                borderRadius: 14, padding: '1rem 1.2rem', margin: '0 0 1.4rem',
                color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', lineHeight: 1.6, textAlign: 'left',
              }}>
                {mensaje}
              </div>
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '1rem 1.5rem', borderRadius: 9999, background: '#25d366',
                  color: '#fff', fontWeight: 800, fontSize: '0.98rem', textDecoration: 'none',
                  boxShadow: '0 8px 28px rgba(37,211,102,0.35)',
                  transition: 'transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s',
                }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 16px 40px rgba(37,211,102,0.5)'; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.transform = ''; el.style.boxShadow = '0 8px 28px rgba(37,211,102,0.35)'; }}>
                💬 Enviar por WhatsApp
              </a>
              <button onClick={reset}
                style={{
                  display: 'block', margin: '1rem auto 0', background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', cursor: 'pointer',
                  fontFamily: 'var(--font-jakarta)',
                }}>
                ↺ Empezar de nuevo
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes cotFade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes cotPop  { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @media (max-width: 420px) { .cot-opts { grid-template-columns: 1fr !important; } }
        @media (prefers-reduced-motion: reduce) {
          [style*="cotFade"], [style*="cotPop"] { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
