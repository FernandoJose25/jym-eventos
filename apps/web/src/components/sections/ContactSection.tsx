'use client';
import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { z } from 'zod';

const schema = z.object({
  nombre:      z.string().min(2, 'El nombre es requerido'),
  telefono:    z.string().min(6, 'El teléfono es requerido'),
  correo:      z.string().email('Correo inválido'),
  distrito:    z.string().optional(),
  tipoEvento:  z.string().optional(),
  fechaEvento: z.string().optional(),
  invitados:   z.string().optional(),
  presupuesto: z.string().optional(),
  mensaje:     z.string().optional(),
});

interface Props {
  data: {
    telefono?: string; email?: string; direccion?: string; horario?: string;
    whatsapp?: string; instagram?: string; facebook?: string; tiktok?: string;
  };
}

const SERVICIOS_OPTIONS = [
  'Shows Infantiles','Show Hora Loca','Activaciones Empresariales',
  'Catering y Snacks','Filmación y Fotografía','Decoración Temática',
  'Bautizo','Quinceañero','Matrimonio','Cumpleaños','Otro',
];
const PRESUPUESTO_OPTIONS = [
  'Menos de S/. 500','S/. 500 – S/. 1,000','S/. 1,000 – S/. 2,000',
  'S/. 2,000 – S/. 5,000','Más de S/. 5,000','Por definir',
];

const WA_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function ContactSection({ data }: Props) {
  const [form,   setForm]   = useState({ nombre:'', telefono:'', correo:'', distrito:'',
                                          tipoEvento:'', fechaEvento:'', invitados:'', presupuesto:'', mensaje:'' });
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const wa = data?.whatsapp || '51945203708';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg('');
    const result = schema.safeParse(form);
    if (!result.success) { setErrMsg(result.error.errors[0].message); return; }
    setStatus('loading');
    try {
      const now = new Date();
      await addDoc(collection(db, 'mensajes'), {
        ...result.data,
        fechaEnvio:   now.toISOString(),
        fechaLegible: now.toLocaleString('es-PE', { timeZone:'America/Lima', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }),
        estado: 'pendiente', leido: false,
        origen: typeof window !== 'undefined' ? window.location.pathname : '/',
      });
      fetch('/api/notify', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...result.data, fechaLegible: now.toLocaleString('es-PE',{timeZone:'America/Lima'}) }),
      }).catch(()=>{});
      setStatus('success');
    } catch {
      setStatus('error');
      setErrMsg('No se pudo enviar. Escríbenos al WhatsApp: +51 945 203 708');
    }
  };

  const field = (id: keyof typeof form) => ({
    value: form[id],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [id]: e.target.value })),
  });

  const inp: React.CSSProperties = {
    width:'100%', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10,
    padding:'0.8rem 1rem', fontSize:'0.88rem',
    color:'rgba(255,255,255,0.9)', background:'rgba(255,255,255,0.05)',
    outline:'none', fontFamily:'var(--font-jakarta)',
    transition:'border .2s, box-shadow .2s, background .2s', boxSizing:'border-box' as const,
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(212,160,23,0.7)';
    e.target.style.boxShadow   = '0 0 0 3px rgba(212,160,23,0.12)';
    e.target.style.background  = 'rgba(212,160,23,0.06)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
    e.target.style.boxShadow   = 'none';
    e.target.style.background  = 'rgba(255,255,255,0.05)';
  };
  const lbl: React.CSSProperties = {
    display:'block', fontSize:'0.65rem', fontWeight:700,
    textTransform:'uppercase', letterSpacing:'.12em',
    color:'rgba(255,255,255,0.35)', marginBottom:6,
  };

  const contactInfo = [
    { icon:'📞', label:'Teléfono / WhatsApp', value: data?.telefono||'+51 945 203 708', sub:'Atención inmediata', href:`https://wa.me/${wa}` },
    { icon:'✉️', label:'Correo',              value: data?.email||'jmdecoracionesyeventossechura@gmail.com', href:`mailto:${data?.email||'jmdecoracionesyeventossechura@gmail.com'}` },
    { icon:'📍', label:'Ubicación',           value: data?.direccion||'Sechura, Piura, Perú' },
    { icon:'🕐', label:'Horario',             value: data?.horario||'Lun–Dom · 9:00 AM – 8:00 PM' },
  ];

  return (
    <section id="contacto" style={{
      position:'relative', overflow:'hidden',
      background:'linear-gradient(160deg,#050d1a 0%,#0a1628 45%,#0d1f3c 100%)',
      padding:'7rem 0',
    }}>
      {/* Background grid */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)', backgroundSize:'72px 72px', pointerEvents:'none' }}/>

      {/* Floating orbs */}
      {[
        { s:520, x:'5%',  y:'10%', c:'rgba(212,160,23,0.1)', dur:9 },
        { s:380, x:'75%', y:'60%', c:'rgba(37,99,235,0.1)',  dur:11 },
        { s:260, x:'55%', y:'5%',  c:'rgba(139,92,246,0.08)', dur:7 },
      ].map((o,i) => (
        <div key={i} style={{ position:'absolute', borderRadius:'50%', width:o.s, height:o.s,
          left:o.x, top:o.y, pointerEvents:'none',
          background:`radial-gradient(circle at 30% 30%,${o.c},transparent 70%)`,
          filter:'blur(48px)', animation:`ctaOrb${i} ${o.dur}s ease-in-out infinite` }}/>
      ))}

      {/* Gold line top */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
        background:'linear-gradient(90deg,transparent 0%,#d4a017 30%,#f5c842 50%,#d4a017 70%,transparent 100%)'}}/>

      <div className="container" style={{ position:'relative', zIndex:2 }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'4.5rem' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0.4rem 1.25rem',
            borderRadius:9999, background:'rgba(212,160,23,0.1)', border:'1px solid rgba(212,160,23,0.3)',
            color:'#d4a017', fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase',
            letterSpacing:'.2em', marginBottom:'1.25rem' }}>
            ✦ Hablemos
          </span>
          <h2 style={{ fontFamily:'var(--font-playfair)', fontSize:'clamp(2.25rem,4.5vw,3.75rem)',
            color:'#fff', lineHeight:1.05, margin:'0 0 1rem' }}>
            ¿Listo para crear algo{' '}
            <span style={{ background:'linear-gradient(135deg,#b8860b,#f5c842,#b8860b)',
              backgroundSize:'200% auto', WebkitBackgroundClip:'text',
              WebkitTextFillColor:'transparent', backgroundClip:'text',
              fontStyle:'italic', animation:'shimmer 4s linear infinite' }}>
              inolvidable?
            </span>
          </h2>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'1rem', maxWidth:480, margin:'0 auto' }}>
            Cuéntanos tu sueño y te preparamos una propuesta personalizada sin compromiso.
          </p>
        </div>

        {/* Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.55fr', gap:'3rem', alignItems:'start' }}
             className="cs-grid">

          {/* ─── Left panel ─── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

            {contactInfo.map(({ icon, label, value, sub, href }) => (
              <div key={label}
                   style={{ display:'flex', gap:14, padding:'1.1rem 1.25rem',
                     borderRadius:16, background:'rgba(255,255,255,0.04)',
                     border:'1px solid rgba(255,255,255,0.07)',
                     backdropFilter:'blur(12px)', transition:'all .3s cubic-bezier(0.23,1,0.32,1)' }}
                   onMouseEnter={e => { const el = e.currentTarget as HTMLElement;
                     el.style.borderColor = 'rgba(212,160,23,0.35)';
                     el.style.background  = 'rgba(212,160,23,0.06)';
                     el.style.transform   = 'translateX(6px)'; }}
                   onMouseLeave={e => { const el = e.currentTarget as HTMLElement;
                     el.style.borderColor = 'rgba(255,255,255,0.07)';
                     el.style.background  = 'rgba(255,255,255,0.04)';
                     el.style.transform   = ''; }}>
                <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                  background:'linear-gradient(135deg,rgba(212,160,23,0.2),rgba(212,160,23,0.08))',
                  border:'1px solid rgba(212,160,23,0.25)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>
                  {icon}
                </div>
                <div style={{ overflow:'hidden' }}>
                  <p style={{ fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'.12em', color:'rgba(255,255,255,0.3)', margin:'0 0 3px' }}>
                    {label}
                  </p>
                  {href
                    ? <a href={href} style={{ color:'rgba(255,255,255,0.8)', fontSize:'0.85rem',
                        fontWeight:600, textDecoration:'none', wordBreak:'break-all',
                        transition:'color .2s' }}
                       onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f5c842'}
                       onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'}>
                        {value}
                      </a>
                    : <p style={{ color:'rgba(255,255,255,0.8)', fontSize:'0.85rem', fontWeight:600, margin:0 }}>{value}</p>
                  }
                  {sub && <p style={{ color:'rgba(255,255,255,0.28)', fontSize:'0.7rem', margin:'2px 0 0' }}>{sub}</p>}
                </div>
              </div>
            ))}

            {/* Social links */}
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:4 }}>
              {[
                {
                  href: data?.instagram||'https://www.instagram.com/jmdecoracionesyeventos1/',
                  bg:'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',
                  shadow:'rgba(253,29,29,0.45)',
                  label:'Instagram',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
                },
                {
                  href: data?.facebook||'https://www.facebook.com/JM.EventosyDecoraciones',
                  bg:'#1877f2',
                  shadow:'rgba(24,119,242,0.45)',
                  label:'Facebook',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
                },
                {
                  href: data?.tiktok||'https://www.tiktok.com/@jmdecoraciones.18',
                  bg:'#010101',
                  shadow:'rgba(0,0,0,0.5)',
                  label:'TikTok',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.75a4.85 4.85 0 01-1-.06z"/></svg>,
                },
              ].map(({ href, bg, shadow, label, icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                   title={label}
                   style={{ width:46, height:46, borderRadius:12, background:bg,
                     display:'flex', alignItems:'center', justifyContent:'center',
                     color:'#fff', textDecoration:'none',
                     transition:'all .25s cubic-bezier(0.23,1,0.32,1)',
                     animation:`socialFloat${label} 3s ease-in-out infinite`,
                     boxShadow:`0 4px 14px ${shadow}` }}
                   onMouseEnter={e => { const el = e.currentTarget as HTMLElement;
                     el.style.transform   = 'translateY(-6px) scale(1.12)';
                     el.style.boxShadow   = `0 14px 32px ${shadow}`; }}
                   onMouseLeave={e => { const el = e.currentTarget as HTMLElement;
                     el.style.transform   = '';
                     el.style.boxShadow   = `0 4px 14px ${shadow}`; }}>
                  {icon}
                </a>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <a href={`https://wa.me/${wa}?text=Hola!%20Me%20gustaría%20cotizar%20un%20evento`}
               target="_blank" rel="noopener noreferrer"
               style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                 padding:'1rem 1.5rem', background:'#25d366', borderRadius:14,
                 color:'#fff', fontWeight:700, fontSize:'0.92rem', textDecoration:'none',
                 boxShadow:'0 8px 28px rgba(37,211,102,0.3)', transition:'all .3s' }}
               onMouseEnter={e => { const el = e.currentTarget as HTMLElement;
                 el.style.transform   = 'translateY(-3px)';
                 el.style.boxShadow   = '0 16px 40px rgba(37,211,102,0.4)'; }}
               onMouseLeave={e => { const el = e.currentTarget as HTMLElement;
                 el.style.transform   = '';
                 el.style.boxShadow   = '0 8px 28px rgba(37,211,102,0.3)'; }}>
              {WA_SVG}
              Respuesta inmediata por WhatsApp
            </a>
          </div>

          {/* ─── Form card ─── */}
          <div style={{ borderRadius:24, overflow:'hidden',
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.08)',
            backdropFilter:'blur(20px)',
            boxShadow:'0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)' }}>

            {/* Card header strip */}
            <div style={{ padding:'1.75rem 2rem', borderBottom:'1px solid rgba(255,255,255,0.06)',
              background:'rgba(212,160,23,0.05)',
              display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <p style={{ fontFamily:'var(--font-playfair)', color:'#fff', fontSize:'1.1rem',
                  fontWeight:700, margin:0 }}>Envíanos tu consulta</p>
                <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.75rem', margin:'3px 0 0' }}>
                  Respuesta en menos de 2 horas
                </p>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {['#ff5f57','#ffbd2e','#28c840'].map(c => (
                  <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c, opacity:.7 }}/>
                ))}
              </div>
            </div>

            <div style={{ padding:'2rem' }}>
              {status === 'success' ? (
                <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
                  <div style={{ width:72, height:72, borderRadius:'50%', margin:'0 auto 1.5rem',
                    background:'linear-gradient(135deg,rgba(212,160,23,0.2),rgba(212,160,23,0.05))',
                    border:'1px solid rgba(212,160,23,0.3)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem' }}>
                    🎉
                  </div>
                  <h3 style={{ fontFamily:'var(--font-playfair)', color:'#fff', fontSize:'1.4rem', margin:'0 0 10px' }}>
                    ¡Consulta enviada!
                  </h3>
                  <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.88rem', lineHeight:1.7, marginBottom:24 }}>
                    Hemos recibido tu mensaje. Te contactaremos muy pronto por WhatsApp o correo electrónico.
                  </p>
                  <a href={`https://wa.me/${wa}?text=Hola%2C%20acabo%20de%20enviar%20mi%20consulta!`}
                     target="_blank" rel="noopener noreferrer"
                     style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0.8rem 1.75rem',
                       background:'#25d366', color:'#fff', borderRadius:10, fontWeight:700,
                       fontSize:'0.9rem', textDecoration:'none' }}>
                    {WA_SVG} Escribir por WhatsApp
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }} noValidate>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={lbl}>Nombre *</label>
                      <input type="text" placeholder="Tu nombre" style={inp} required
                             {...field('nombre')} onFocus={onFocus} onBlur={onBlur}/>
                    </div>
                    <div>
                      <label style={lbl}>Teléfono *</label>
                      <input type="tel" placeholder="+51 945 000 000" style={inp} required
                             {...field('telefono')} onFocus={onFocus} onBlur={onBlur}/>
                    </div>
                    <div style={{ gridColumn:'span 2' }}>
                      <label style={lbl}>Correo electrónico *</label>
                      <input type="email" placeholder="tu@correo.com" style={inp} required suppressHydrationWarning
                             {...field('correo')} onFocus={onFocus} onBlur={onBlur}/>
                    </div>
                    <div>
                      <label style={lbl}>Tipo de evento</label>
                      <select style={{ ...inp, cursor:'pointer' }} {...field('tipoEvento')}
                              onFocus={onFocus} onBlur={onBlur}>
                        <option value="" style={{ background:'#0a1628' }}>Selecciona…</option>
                        {SERVICIOS_OPTIONS.map(o => <option key={o} style={{ background:'#0a1628' }}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Fecha del evento</label>
                      <input type="date" style={inp} {...field('fechaEvento')} onFocus={onFocus} onBlur={onBlur}/>
                    </div>
                    <div>
                      <label style={lbl}>N° de invitados</label>
                      <input type="number" placeholder="Ej: 50" style={inp}
                             {...field('invitados')} onFocus={onFocus} onBlur={onBlur}/>
                    </div>
                    <div>
                      <label style={lbl}>Presupuesto</label>
                      <select style={{ ...inp, cursor:'pointer' }} {...field('presupuesto')}
                              onFocus={onFocus} onBlur={onBlur}>
                        <option value="" style={{ background:'#0a1628' }}>Selecciona…</option>
                        {PRESUPUESTO_OPTIONS.map(o => <option key={o} style={{ background:'#0a1628' }}>{o}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn:'span 2' }}>
                      <label style={lbl}>Mensaje</label>
                      <textarea rows={3} placeholder="Cuéntanos sobre tu evento, temática, lugar…"
                                style={{ ...inp, resize:'vertical' }}
                                {...field('mensaje')} onFocus={onFocus} onBlur={onBlur}/>
                    </div>
                  </div>

                  {errMsg && (
                    <div style={{ background:'rgba(159,18,57,0.15)', border:'1px solid rgba(252,165,165,0.3)',
                      borderRadius:10, padding:'0.7rem 1rem', color:'#fca5a5', fontSize:'0.82rem' }}>
                      ⚠️ {errMsg}
                    </div>
                  )}

                  <button type="submit" disabled={status === 'loading'}
                          style={{ padding:'1rem', border:'none', borderRadius:12,
                            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                            background:'linear-gradient(135deg,#b8860b,#f5c842)',
                            color:'#0a1628', fontWeight:800, fontSize:'0.92rem',
                            fontFamily:'var(--font-jakarta)', letterSpacing:'.02em',
                            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                            opacity: status === 'loading' ? 0.7 : 1,
                            boxShadow:'0 4px 20px rgba(212,160,23,0.35)',
                            transition:'all .3s cubic-bezier(0.23,1,0.32,1)' }}
                          onMouseEnter={e => { if(status!=='loading') { const el = e.currentTarget as HTMLElement;
                            el.style.transform   = 'translateY(-2px)';
                            el.style.boxShadow   = '0 12px 36px rgba(212,160,23,0.5)'; }}}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement;
                            el.style.transform   = '';
                            el.style.boxShadow   = '0 4px 20px rgba(212,160,23,0.35)'; }}>
                    {status === 'loading'
                      ? <><span style={{ width:16, height:16, border:'2px solid rgba(10,22,40,.3)',
                          borderTopColor:'#0a1628', borderRadius:'50%',
                          animation:'csSpin .7s linear infinite', display:'inline-block' }}/> Enviando…</>
                      : '✨ Enviar cotización'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:1023px){ .cs-grid{ grid-template-columns:1fr !important; } }
        @keyframes csSpin { to { transform:rotate(360deg) } }
        @keyframes shimmer { from{background-position:0% center} to{background-position:200% center} }
        @keyframes ctaOrb0 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,-30px)} }
        @keyframes ctaOrb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,20px)} }
        @keyframes ctaOrb2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,40px)} }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); }
        @keyframes socialFloatInstagram { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes socialFloatFacebook  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes socialFloatTikTok    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      `}</style>
    </section>
  );
}
