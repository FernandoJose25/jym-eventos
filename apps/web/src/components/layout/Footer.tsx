'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FooterService { id: string; title: string; link: string }

const toSlug = (link: string) =>
  '/servicios/' + link.replace('servicios/', '').replace('.html', '');

export default function Footer() {
  const [contacto,  setContacto]  = useState<any>({});
  const [servicios, setServicios] = useState<FooterService[]>([]);

  useEffect(() => {
    getDoc(doc(db, 'site_config', 'contacto')).then(s => { if (s.exists()) setContacto(s.data()); });
  }, []);

  useEffect(() => onSnapshot(
    query(collection(db, 'services'), where('visible', '==', true), orderBy('order', 'asc')),
    snap => setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() })) as FooterService[])
  ), []);

  const year = new Date().getFullYear();
  const wa   = contacto.whatsapp || '51945203708';

  return (
    <footer style={{ background:'#050d1a', color:'rgba(255,255,255,0.75)', position:'relative', overflow:'hidden' }}>
      {/* Línea dorada superior */}
      <div style={{ height:3, background:'linear-gradient(90deg,transparent,#d4a017,transparent)' }}/>

      {/* Decoración */}
      <div style={{ position:'absolute', top:-200, right:-200, width:500, height:500, borderRadius:'50%',
                     background:'rgba(212,160,23,0.03)', pointerEvents:'none' }}/>

      <div className="container" style={{ padding:'4rem 1.5rem 2rem' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'2.5rem',
                       marginBottom:'3rem' }} className="footer-grid">

          {/* Columna 1 — Marca */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <div style={{ width:52, height:52, borderRadius:50, overflow:'hidden',
                             background:'linear-gradient(135deg,#b8860b,#f5c842)',
                             display:'flex', alignItems:'center', justifyContent:'center',
                             fontSize:'1.5rem', flexShrink:0 }}>
                🎉
              </div>
              <div>
                <p style={{ color:'#fff', fontFamily:'var(--font-playfair)', fontWeight:700, fontSize:'1.1rem', margin:0, lineHeight:1.2 }}>
                  J&M Eventos y<br/>Decoraciones
                </p>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.65rem', margin:0, textTransform:'uppercase', letterSpacing:'.1em' }}>
                  Sechura
                </p>
              </div>
            </div>
            <p style={{ fontSize:'0.85rem', lineHeight:1.7, color:'rgba(255,255,255,0.55)', marginBottom:16 }}>
              En cada evento, cuidamos cada detalle para que tú solo te encargues de disfrutar. Ofrecemos una gama completa de servicios para hacer de tu celebración una experiencia única.
            </p>
            <p style={{ fontFamily:'var(--font-playfair)', fontStyle:'italic', color:'rgba(255,255,255,0.3)', fontSize:'0.88rem' }}>
              J&M Eventos y Decoraciones
            </p>
          </div>

          {/* Columna 2 — Servicios */}
          <div>
            <h4 style={{ color:'#fff', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase',
                          letterSpacing:'.12em', marginBottom:20, paddingBottom:12,
                          borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
              Nuestros Servicios
            </h4>
            <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:10 }}>
              {servicios.map(s => (
                <li key={s.id}>
                  <a href={toSlug(s.link)}
                     style={{ color:'rgba(255,255,255,0.55)', textDecoration:'none', fontSize:'0.88rem',
                               transition:'color .2s', display:'flex', alignItems:'center', gap:6 }}
                     onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#f5c842'}
                     onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.55)'}>
                    <span style={{ color:'#d4a017', fontSize:'0.6rem' }}>▶</span> {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3 — Otros links */}
          <div>
            <h4 style={{ color:'#fff', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase',
                          letterSpacing:'.12em', marginBottom:20, paddingBottom:12,
                          borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
              Otros Links
            </h4>
            <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { label:'Sobre Nosotros', href:'/sobre-nosotros' },
                { label:'Galería de Eventos', href:'/galeria' },
                { label:'Contacto', href:'/contacto' },
                { label:'Política de Privacidad', href:'/privacidad' },
                { label:'Términos del Servicio', href:'/terminos' },
                { label:'Política de Cookies', href:'/cookies' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href}
                     style={{ color:'rgba(255,255,255,0.55)', textDecoration:'none', fontSize:'0.88rem',
                               transition:'color .2s', display:'flex', alignItems:'center', gap:6 }}
                     onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#f5c842'}
                     onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.55)'}>
                    <span style={{ color:'#d4a017', fontSize:'0.6rem' }}>▶</span> {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 4 — Contacto */}
          <div>
            <h4 style={{ color:'#fff', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase',
                          letterSpacing:'.12em', marginBottom:20, paddingBottom:12,
                          borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
              Información de Contacto
            </h4>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { icon:'📞', label:contacto.telefono||'(+51) 945 203 708', sub:'WhatsApp disponible', href:`https://wa.me/${wa}` },
                { icon:'✉️', label:contacto.email||'jmdecoracionesyeventossechura@gmail.com', href:`mailto:${contacto.email}` },
                { icon:'📍', label:contacto.direccion||'Sechura, Piura - Sechura' },
              ].map(({ icon, label, sub, href }) => (
                <div key={label} style={{ display:'flex', gap:10 }}>
                  <span style={{ fontSize:'1rem', flexShrink:0, marginTop:1 }}>{icon}</span>
                  <div>
                    {href
                      ? <a href={href} style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.82rem', textDecoration:'none', transition:'color .2s' }}
                           onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#f5c842'}
                           onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.7)'}>{label}</a>
                      : <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.82rem', margin:0 }}>{label}</p>
                    }
                    {sub && <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.72rem', margin:'2px 0 0' }}>{sub}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Redes sociales */}
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              {[
                { icon:'IG', bg:'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', href:contacto.instagram||'https://www.instagram.com/jmdecoracionesyeventos1/', label:'Instagram' },
                { icon:'FB', bg:'#1877f2', href:contacto.facebook||'https://www.facebook.com/JM.EventosyDecoraciones', label:'Facebook' },
                { icon:'TT', bg:'#000', href:contacto.tiktok||'https://www.tiktok.com/@jmdecoraciones.18', label:'TikTok' },
                { icon:'WA', bg:'#25d366', href:`https://wa.me/${wa}`, label:'WhatsApp' },
              ].map(({ icon, bg, href, label }) => (
                <a key={icon} href={href} target="_blank" rel="noopener noreferrer"
                   aria-label={label}
                   style={{ width:38, height:38, borderRadius:10, background:bg,
                             display:'flex', alignItems:'center', justifyContent:'center',
                             color:'#fff', fontSize:'0.65rem', fontWeight:700, letterSpacing:'.02em',
                             textDecoration:'none', transition:'all .25s', flexShrink:0 }}
                   onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-3px)';(e.currentTarget as HTMLElement).style.boxShadow='0 8px 20px rgba(0,0,0,0.3)';}}
                   onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.boxShadow='';}}>
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Línea separadora */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'1.5rem',
                       display:'flex', justifyContent:'space-between', alignItems:'center',
                       flexWrap:'wrap', gap:12 }}>
          <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.3)', margin:0 }}>
            © 2018 – {year} J&M Eventos y Decoraciones | Todos los derechos reservados.
          </p>
          <div style={{ display:'flex', gap:20 }}>
            {[
              { label:'Privacidad', href:'/privacidad' },
              { label:'Términos', href:'/terminos' },
              { label:'Cookies', href:'/cookies' },
            ].map(({ label, href }) => (
              <a key={label} href={href}
                 style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.3)', textDecoration:'none', transition:'color .2s' }}
                 onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#f5c842'}
                 onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.3)'}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:1023px){ .footer-grid{ grid-template-columns:1fr 1fr !important; gap:2rem !important; } }
        @media(max-width:640px) { .footer-grid{ grid-template-columns:1fr !important; } }
      `}</style>
    </footer>
  );
}