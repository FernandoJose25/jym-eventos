'use client';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function toPlain(d: Record<string, any>): Record<string, any> {
  const r: Record<string, any> = {};
  for (const [k, v] of Object.entries(d)) {
    if (!v || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') r[k] = v;
    else if (v?.toDate) r[k] = v.toDate().toISOString();
    else if (typeof v === 'object' && 'seconds' in v) r[k] = new Date(v.seconds * 1000).toISOString();
    else if (typeof v === 'object') r[k] = toPlain(v);
  }
  return r;
}

const TIPOS = ['Shows Infantiles', 'Hora Loca', 'Activaciones Empresariales', 'Catering y Carritos Snacks', 'Filmación y Fotografía', 'Decoración Temática', 'Bautizo', 'Quinceañero', 'Matrimonio', 'Cumpleaños Adulto', 'Otro'];
const PRESUPUESTOS = ['Menos de S/. 500', 'S/. 500 – S/. 1,000', 'S/. 1,000 – S/. 2,000', 'S/. 2,000 – S/. 5,000', 'Más de S/. 5,000', 'Por definir'];
const INVITADOS = ['Menos de 30', '30 – 60', '60 – 100', '100 – 200', 'Más de 200'];

const WA_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function ContactoClient({ initialContacto }: { initialContacto?: Record<string, any> }) {
  const [contacto, setContacto] = useState<any>(initialContacto || {});
  const [form, setForm] = useState({
    nombre: '', telefono: '', correo: '', distrito: '',
    tipoEvento: '', fechaEvento: '', invitados: '', presupuesto: '', mensaje: ''
  });
  const [_web, setWeb] = useState(''); // honeypot anti-bot, no lo llena un humano
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  /* Refresca en el cliente por si el admin editó después del último SSR */
  useEffect(() => {
    getDoc(doc(db, 'site_config', 'contacto')).then(s => { if (s.exists()) setContacto(toPlain(s.data())); });
  }, []);

  const wa = contacto.whatsapp || '51945203708';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.telefono || !form.correo) {
      setError('Nombre, teléfono y correo son obligatorios'); return;
    }
    setError(''); setStatus('loading');
    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, _web }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setError('Ya enviaste varias consultas seguidas. Espera unos minutos o escríbenos por WhatsApp.');
        } else {
          setError('Error al enviar. Por favor escríbenos directamente al WhatsApp.');
        }
        setStatus('error');
        return;
      }
      setStatus('success');
      setForm({ nombre: '', telefono: '', correo: '', distrito: '', tipoEvento: '', fechaEvento: '', invitados: '', presupuesto: '', mensaje: '' });
    } catch {
      setStatus('error');
      setError('Error al enviar. Por favor escríbenos directamente al WhatsApp.');
    }
  };

  const field = (id: keyof typeof form) => ({
    id,
    name: id,
    value: form[id],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [id]: e.target.value })),
  });

  const inp: React.CSSProperties = {
    width: '100%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
    padding: '0.82rem 1rem', fontSize: '0.88rem',
    color: 'rgba(255,255,255,0.88)', background: 'rgba(255,255,255,0.05)',
    outline: 'none', fontFamily: 'var(--font-jakarta)',
    transition: 'border .2s, box-shadow .2s, background .2s', boxSizing: 'border-box' as const,
  };
  const onF = (e: React.FocusEvent<any>) => {
    e.target.style.borderColor = 'rgba(212,160,23,0.7)';
    e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.12)';
    e.target.style.background = 'rgba(212,160,23,0.07)';
  };
  const onB = (e: React.FocusEvent<any>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
    e.target.style.boxShadow = 'none';
    e.target.style.background = 'rgba(255,255,255,0.05)';
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '.12em', color: 'rgba(255,255,255,0.32)', marginBottom: 6,
  };

  return (
    <>
      {/* ── HERO ── */}
      <section style={{
        paddingTop: '9rem', paddingBottom: '5rem',
        background: 'radial-gradient(ellipse 110% 80% at 50% 10%, #0f2044 0%, #050d1a 60%, #000 100%)',
        position: 'relative', overflow: 'hidden', textAlign: 'center',
      }}>
        {/* Grid bg */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '72px 72px', pointerEvents: 'none' }} />

        {/* Rings */}
        {[600, 440, 300, 180].map(s => (
          <div key={s} style={{
            position: 'absolute', top: '50%', left: '50%', width: s, height: s,
            borderRadius: '50%', border: `1px solid rgba(212,160,23,${0.03 + (600 - s) / 3000})`,
            transform: 'translate(-50%,-50%)', animation: `ringRot ${16 + s / 60}s linear infinite ${s % 2 === 0 ? '' : 'reverse'}`,
            pointerEvents: 'none'
          }} />
        ))}

        {/* Orbs */}
        <div style={{
          position: 'absolute', top: '10%', left: '5%', width: 400, height: 400,
          borderRadius: '50%', background: 'radial-gradient(circle,rgba(212,160,23,0.1),transparent 70%)',
          filter: 'blur(48px)', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', right: '8%', width: 300, height: 300,
          borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,0.12),transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none'
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <nav style={{
            color: 'rgba(255,255,255,.35)', fontSize: '0.75rem', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
            <a href="/" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f5c842'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.35)'}>
              Inicio
            </a>
            <span style={{ opacity: .4 }}>›</span>
            <span style={{ color: 'rgba(255,255,255,.7)' }}>Contacto</span>
          </nav>

          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.38rem 1.2rem',
            borderRadius: 9999, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.3)',
            color: '#f5c842', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.2em', marginBottom: '1.5rem'
          }}>
            ✦ Contáctanos
          </span>

          <h1 style={{
            fontFamily: 'var(--font-playfair)', color: '#fff',
            fontSize: 'clamp(2.25rem,5.5vw,4.25rem)', lineHeight: 1.05, margin: '0 0 1.25rem'
          }}>
            Planifiquemos tu próximo{' '}
            <span style={{
              background: 'linear-gradient(135deg,#b8860b,#f5c842,#b8860b)',
              backgroundSize: '200% auto', WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              fontStyle: 'italic', animation: 'shimmer 4s linear infinite'
            }}>
              evento
            </span>
          </h1>

          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '1.05rem', maxWidth: 520, margin: '0 auto' }}>
            Escríbenos y hagamos realidad esa celebración llena de magia, alegría y sorpresas que siempre soñaste.
          </p>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <section style={{
        background: 'linear-gradient(180deg,#050d1a 0%,#0a1628 50%,#050d1a 100%)',
        padding: '5rem 0 7rem', position: 'relative', overflow: 'hidden',
      }}>
        {/* Grid bg */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)', backgroundSize: '72px 72px', pointerEvents: 'none' }} />

        {/* Orbs */}
        <div style={{
          position: 'absolute', top: '10%', right: '5%', width: 500, height: 500,
          borderRadius: '50%', background: 'radial-gradient(circle,rgba(212,160,23,0.07),transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', left: '2%', width: 350, height: 350,
          borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,0.08),transparent 70%)',
          filter: 'blur(50px)', pointerEvents: 'none'
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.7fr', gap: '3.5rem', alignItems: 'start' }}
            className="cp-grid">

            {/* ─── Left: Info panel ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              <p style={{
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.2em', color: '#d4a017', marginBottom: 4
              }}>
                Información de contacto
              </p>

              {[
                { icon: '📱', title: 'WhatsApp / Teléfono', value: contacto.telefono || '(+51) 945 203 708', sub: 'Respuesta inmediata', href: `https://wa.me/${wa}` },
                { icon: '✉️', title: 'Correo electrónico', value: contacto.email || 'jmdecoracionesyeventossechura@gmail.com', href: `mailto:${contacto.email || 'jmdecoracionesyeventossechura@gmail.com'}` },
                { icon: '📍', title: 'Ubicación', value: contacto.direccion || 'Sechura, Piura, Perú' },
                { icon: '🕐', title: 'Horario de atención', value: contacto.horario || 'Lunes a Domingo · 9:00 AM – 8:00 PM' },
              ].map(({ icon, title, value, sub, href }) => (
                <div key={title}
                  style={{
                    display: 'flex', gap: 14, padding: '1.1rem 1.25rem',
                    borderRadius: 16, background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(12px)', transition: 'all .3s cubic-bezier(0.23,1,0.32,1)'
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(212,160,23,0.35)';
                    el.style.background = 'rgba(212,160,23,0.06)';
                    el.style.transform = 'translateX(6px)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(255,255,255,0.07)';
                    el.style.background = 'rgba(255,255,255,0.04)';
                    el.style.transform = '';
                  }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg,rgba(212,160,23,0.2),rgba(212,160,23,0.06))',
                    border: '1px solid rgba(212,160,23,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem'
                  }}>
                    {icon}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{
                      fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '.12em', color: 'rgba(255,255,255,0.28)', margin: '0 0 3px'
                    }}>
                      {title}
                    </p>
                    {href
                      ? <a href={href} style={{
                        color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem',
                        fontWeight: 600, textDecoration: 'none', wordBreak: 'break-all', transition: 'color .2s'
                      }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f5c842'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'}>
                        {value}
                      </a>
                      : <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{value}</p>
                    }
                    {sub && <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.7rem', margin: '2px 0 0' }}>{sub}</p>}
                  </div>
                </div>
              ))}

              {/* Redes */}
              <div>
                <p style={{
                  fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '.12em', color: 'rgba(255,255,255,0.28)', margin: '8px 0 10px', textAlign: 'center'
                }}>
                  Síguenos
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {[
                    {
                      label: 'Instagram', bg: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',
                      shadow: 'rgba(253,29,29,0.45)',
                      href: contacto.instagram || 'https://www.instagram.com/jmdecoracionesyeventos1/',
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>,
                    },
                    {
                      label: 'Facebook', bg: '#1877f2',
                      shadow: 'rgba(24,119,242,0.45)',
                      href: contacto.facebook || 'https://www.facebook.com/JM.EventosyDecoraciones',
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
                    },
                    {
                      label: 'TikTok', bg: '#010101',
                      shadow: 'rgba(0,0,0,0.5)',
                      href: contacto.tiktok || 'https://www.tiktok.com/@jmdecoraciones.18',
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.75a4.85 4.85 0 01-1-.06z" /></svg>,
                    },
                  ].map(({ label, bg, shadow, href, icon }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                      title={label}
                      style={{
                        width: 46, height: 46, borderRadius: 12, background: bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', textDecoration: 'none', transition: 'all .25s cubic-bezier(0.23,1,0.32,1)',
                        boxShadow: `0 4px 14px ${shadow}`,
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = 'translateY(-5px) scale(1.1)';
                        el.style.boxShadow = `0 14px 30px ${shadow}`;
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = '';
                        el.style.boxShadow = `0 4px 14px ${shadow}`;
                      }}>
                      {icon}
                    </a>
                  ))}
                </div>
              </div>

              {/* WhatsApp CTA */}
              <a href={`https://wa.me/${wa}?text=Hola%2C%20quiero%20cotizar%20un%20evento`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '1rem 1.5rem', background: '#25d366', borderRadius: 14,
                  color: '#fff', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
                  boxShadow: '0 8px 28px rgba(37,211,102,0.28)', transition: 'all .3s', marginTop: 4
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(-3px)';
                  el.style.boxShadow = '0 16px 40px rgba(37,211,102,0.4)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = '';
                  el.style.boxShadow = '0 8px 28px rgba(37,211,102,0.28)';
                }}>
                {WA_SVG} Respuesta inmediata por WhatsApp
              </a>
            </div>

            {/* ─── Right: Form ─── */}
            <div style={{
              borderRadius: 24, overflow: 'hidden',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)'
            }}>

              {/* Card top strip */}
              <div style={{
                padding: '1.75rem 2.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(212,160,23,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
              }}>
                <div>
                  <h2 style={{
                    fontFamily: 'var(--font-playfair)', color: '#fff', fontSize: '1.2rem',
                    fontWeight: 700, margin: 0, lineHeight: 1.2
                  }}>
                    Envíanos tu consulta
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', margin: '4px 0 0' }}>
                    Te respondemos en menos de 2 horas en horario de atención
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {['#ff5f57', '#ffbd2e', '#28c840'].map(c => (
                    <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c, opacity: .65 }} />
                  ))}
                </div>
              </div>

              <div style={{ padding: '2.25rem' }}>
                {status === 'success' ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1.5rem',
                      background: 'linear-gradient(135deg,rgba(212,160,23,0.2),rgba(212,160,23,0.04))',
                      border: '1px solid rgba(212,160,23,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.75rem',
                      animation: 'successPop .5s cubic-bezier(0.34,1.56,0.64,1)'
                    }}>
                      🎉
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-playfair)', color: '#fff', fontSize: '1.5rem', margin: '0 0 10px' }}>
                      ¡Consulta enviada con éxito!
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 28, fontSize: '0.9rem' }}>
                      Hemos recibido tu mensaje. Te contactaremos muy pronto por WhatsApp o correo electrónico.
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <a href={`https://wa.me/${wa}?text=Hola%2C%20acabo%20de%20enviar%20mi%20consulta!`}
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.8rem 1.5rem',
                          background: '#25d366', color: '#fff', borderRadius: 10, fontWeight: 700,
                          fontSize: '0.88rem', textDecoration: 'none'
                        }}>
                        {WA_SVG} WhatsApp
                      </a>
                      <button onClick={() => setStatus('idle')}
                        style={{
                          padding: '0.8rem 1.5rem', borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)',
                          cursor: 'pointer', fontFamily: 'var(--font-jakarta)', fontSize: '0.88rem'
                        }}>
                        Enviar otra consulta
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
                    {/* Honeypot: invisible para humanos, un bot que autorellena todos los inputs sí lo completa */}
                    <input type="text" name="empresa" value={_web} onChange={e => setWeb(e.target.value)}
                      tabIndex={-1} autoComplete="off" aria-hidden="true"
                      style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
                    <div className="cp-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={lbl} htmlFor="nombre">Nombre *</label>
                        <input type="text" placeholder="Tu nombre completo" style={inp} required
                          {...field('nombre')} onFocus={onF} onBlur={onB} />
                      </div>
                      <div>
                        <label style={lbl} htmlFor="telefono">Teléfono *</label>
                        <input type="tel" placeholder="+51 945 000 000" style={inp} required
                          {...field('telefono')} onFocus={onF} onBlur={onB} />
                      </div>
                      <div>
                        <label style={lbl} htmlFor="correo">Correo electrónico *</label>
                        <input type="email" placeholder="tu@correo.com" style={inp} required suppressHydrationWarning
                          {...field('correo')} onFocus={onF} onBlur={onB} />
                      </div>
                      <div>
                        <label style={lbl} htmlFor="distrito">Distrito</label>
                        <input type="text" placeholder="Ej: Sechura, Piura" style={inp}
                          {...field('distrito')} onFocus={onF} onBlur={onB} />
                      </div>
                      <div>
                        <label style={lbl} htmlFor="tipoEvento">Tipo de evento *</label>
                        <select style={{ ...inp, cursor: 'pointer' }} {...field('tipoEvento')} onFocus={onF} onBlur={onB}>
                          <option value="" style={{ background: '#0a1628' }}>Selecciona…</option>
                          {TIPOS.map(t => <option key={t} style={{ background: '#0a1628' }}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl} htmlFor="fechaEvento">Fecha del evento *</label>
                        <input type="date" style={inp} {...field('fechaEvento')} onFocus={onF} onBlur={onB} />
                      </div>
                      <div>
                        <label style={lbl} htmlFor="invitados">N° de invitados</label>
                        <select style={{ ...inp, cursor: 'pointer' }} {...field('invitados')} onFocus={onF} onBlur={onB}>
                          <option value="" style={{ background: '#0a1628' }}>Selecciona…</option>
                          {INVITADOS.map(i => <option key={i} style={{ background: '#0a1628' }}>{i}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl} htmlFor="presupuesto">Presupuesto estimado</label>
                        <select style={{ ...inp, cursor: 'pointer' }} {...field('presupuesto')} onFocus={onF} onBlur={onB}>
                          <option value="" style={{ background: '#0a1628' }}>Selecciona…</option>
                          {PRESUPUESTOS.map(p => <option key={p} style={{ background: '#0a1628' }}>{p}</option>)}
                        </select>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={lbl} htmlFor="mensaje">Mensaje adicional</label>
                        <textarea rows={4} placeholder="Cuéntanos sobre tu evento, temática, lugar, cantidad de niños…"
                          style={{ ...inp, resize: 'vertical' }}
                          {...field('mensaje')} onFocus={onF} onBlur={onB} />
                      </div>
                    </div>

                    {error && (
                      <div style={{
                        background: 'rgba(159,18,57,0.15)', border: '1px solid rgba(252,165,165,0.25)',
                        borderRadius: 10, padding: '0.7rem 1rem', color: '#fca5a5', fontSize: '0.82rem'
                      }}>
                        ⚠️ {error}
                      </div>
                    )}

                    <button type="submit" disabled={status === 'loading'}
                      style={{
                        padding: '1.1rem', border: 'none', borderRadius: 12,
                        cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                        background: 'linear-gradient(135deg,#b8860b,#f5c842)',
                        color: '#0a1628', fontWeight: 800, fontSize: '0.95rem',
                        fontFamily: 'var(--font-jakarta)', letterSpacing: '.02em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        opacity: status === 'loading' ? 0.7 : 1,
                        boxShadow: '0 4px 20px rgba(212,160,23,0.3)',
                        transition: 'all .3s cubic-bezier(0.23,1,0.32,1)'
                      }}
                      onMouseEnter={e => {
                        if (status !== 'loading') {
                          const el = e.currentTarget as HTMLElement;
                          el.style.transform = 'translateY(-2px)';
                          el.style.boxShadow = '0 14px 40px rgba(212,160,23,0.5)';
                        }
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = '';
                        el.style.boxShadow = '0 4px 20px rgba(212,160,23,0.3)';
                      }}>
                      {status === 'loading'
                        ? <><span style={{
                          width: 18, height: 18, border: '2px solid rgba(10,22,40,.3)',
                          borderTopColor: '#0a1628', borderRadius: '50%',
                          animation: 'cpSpin .7s linear infinite', display: 'inline-block'
                        }} /> Enviando…</>
                        : '✨ Enviar Consulta'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media(max-width:1023px){ .cp-grid{ grid-template-columns:1fr !important; } }
        @media(max-width:480px){
          .cp-form-row{ grid-template-columns:1fr !important; }
          .cp-form-row > [style*="span 2"]{ grid-column: span 1 !important; }
        }
        @keyframes cpSpin  { to{ transform:rotate(360deg) } }
        @keyframes ringRot { from{transform:translate(-50%,-50%) rotate(0deg)} to{transform:translate(-50%,-50%) rotate(360deg)} }
        @keyframes shimmer { from{background-position:0% center} to{background-position:200% center} }
        @keyframes successPop { 0%{transform:scale(0.5);opacity:0} 100%{transform:scale(1);opacity:1} }
        input[type="date"]::-webkit-calendar-picker-indicator { filter:invert(0.6); }
        select option { color: #fff; background: #0a1628; }
      `}</style>
    </>
  );
}
