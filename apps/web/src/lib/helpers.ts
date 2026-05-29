// ── lib/firebase.ts (web) ──────────────────────────────────────
// apps/web/src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const cfg = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApp() : initializeApp(cfg);
export const db = getFirestore(app);
export default app;

// ── lib/firebase-server.ts (web — SSR) ────────────────────────
// Para getDoc/getDocs en Server Components (page.tsx / layout.tsx)
// El contenido es idéntico — Next.js maneja la separación server/client
// apps/web/src/lib/firebase-server.ts
// (same as firebase.ts — en Next.js 15 App Router funciona en ambos contextos)


// ── components/ui/AnimateOnScroll.tsx ─────────────────────────
// Wrapper que activa animación CSS cuando el elemento entra al viewport
export function AnimateOnScroll_COMPONENT({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  // Este componente es un placeholder — ver archivo dedicado abajo
  return children as any;
}

// ── components/ui/JsonLd.tsx ──────────────────────────────────
export function JsonLd_COMPONENT({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data, null, 2) }} />
  );
}

// ── components/ui/WhatsAppFloat.tsx ───────────────────────────
export function WhatsAppFloat_COMPONENT({ phone }: { phone: string }) {
  return (
    <a href={`https://wa.me/${phone}?text=Hola, me gustaría cotizar un evento`}
       target="_blank" rel="noopener noreferrer"
       className="whatsapp-float" aria-label="Contactar por WhatsApp">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  );
}

// ── components/layout/Footer.tsx ──────────────────────────────
export function Footer_COMPONENT() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ background:'var(--jym-dark)', color:'rgba(255,255,255,0.7)', padding:'3rem 0 1.5rem' }}>
      <div className="container">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'2rem', marginBottom:'2rem' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#b8860b,#f5c842)',
                             display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>🎉</div>
              <div>
                <p style={{ color:'#fff', fontFamily:'var(--font-playfair)', fontWeight:700, fontSize:'0.95rem', margin:0 }}>
                  J&amp;M Eventos
                </p>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.62rem', margin:0 }}>Decoraciones y Eventos</p>
              </div>
            </div>
            <p style={{ fontSize:'0.82rem', lineHeight:1.6, margin:0 }}>
              Más de 8 años creando celebraciones únicas en Sechura, Piura.
            </p>
          </div>
          <div>
            <h4 style={{ color:'#f5c842', fontSize:'0.78rem', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:12 }}>
              Servicios
            </h4>
            {['Shows Infantiles','Hora Loca','Decoración Temática','Fotografía','Catering'].map(s=>(
              <p key={s} style={{ margin:'0 0 6px', fontSize:'0.82rem' }}>{s}</p>
            ))}
          </div>
          <div>
            <h4 style={{ color:'#f5c842', fontSize:'0.78rem', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:12 }}>
              Contacto
            </h4>
            <p style={{ margin:'0 0 6px', fontSize:'0.82rem' }}>📱 +51 945 203 708</p>
            <p style={{ margin:'0 0 6px', fontSize:'0.82rem' }}>📍 Sechura, Piura, Perú</p>
            <p style={{ margin:'0 0 6px', fontSize:'0.82rem' }}>🕐 Lunes a Domingo 9am–8pm</p>
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:'1.5rem',
                       display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <p style={{ fontSize:'0.75rem', margin:0 }}>
            © {year} J&amp;M Eventos y Decoraciones — Sechura, Piura
          </p>
          <p style={{ fontSize:'0.75rem', margin:0, color:'rgba(255,255,255,0.3)' }}>
            Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
