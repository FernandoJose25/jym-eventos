'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  doc, getDoc, setDoc, collection, query, orderBy,
  onSnapshot, deleteDoc, updateDoc, where, getDocs,
} from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { toast } from 'sonner';
import ImageUploader from '@/components/ui/ImageUploader';
import { useModal } from '@/components/ui/Modal';
import EditModal from '@/components/ui/EditModal';
import { Eye, EyeOff, Trash2, Edit2, Plus } from 'lucide-react';

/* ─────────────────────────────────────────────────────
   DEFAULT ITEMS
───────────────────────────────────────────────────── */
const DEFAULT_BRANDS = [
  { name: 'Telecable Smart', logo: '📡', logoUrl: '', visible: true },
  { name: 'Komatsu', logo: '⚙️', logoUrl: '', visible: true },
  { name: 'Misky Mayo', logo: '🌿', logoUrl: '', visible: true },
  { name: 'Salón El Paraíso', logo: '🏛️', logoUrl: '', visible: true },
  { name: 'Luminex', logo: '💡', logoUrl: '', visible: true },
  { name: 'Quavii', logo: '🎯', logoUrl: '', visible: true },
];

const DEFAULT_WHY_ITEMS = [
  { icon: '🏆', title: 'Experiencia Comprobada', desc: 'Más de 10 años organizando eventos exitosos en Sechura y toda la región Piura.', visible: true },
  { icon: '🎨', title: 'Diseño Personalizado', desc: 'Cada evento es único. Adaptamos cada detalle a tu visión y presupuesto.', visible: true },
  { icon: '⏰', title: 'Puntualidad Garantizada', desc: 'Llegamos antes que tus invitados. La puntualidad es nuestro compromiso.', visible: true },
  { icon: '💎', title: 'Materiales Premium', desc: 'Usamos solo materiales y equipos de primera calidad para resultados excepcionales.', visible: true },
  { icon: '📸', title: 'Momentos Memorables', desc: 'Creamos experiencias que quedarán en la memoria de todos tus invitados.', visible: true },
  { icon: '🤝', title: 'Atención Personalizada', desc: 'Equipo dedicado disponible antes, durante y después de tu evento.', visible: true },
];

const DEFAULT_SEO = {
  homeTitle: 'J&M Decoraciones y Eventos — Eventos de Lujo en Sechura, Piura',
  homeDesc: 'Especialistas en decoración, ambientación y producción integral de eventos. Convertimos cada celebración en una experiencia elegante y memorable. Cotiza tu evento hoy.',
  contactoTitle: 'Contacto y Cotizaciones',
  contactoDesc: 'Cotiza tu evento en Sechura, Piura. Respuesta rápida por WhatsApp. Shows, decoración, catering, quinceaños y paquetes completos.',
  galeriaTitle: 'Galería de Eventos',
  galeriaDesc: 'Fotos y videos reales de shows infantiles, decoración temática, quinceaños y eventos corporativos realizados en Sechura, Piura.',
  nosotrosTitle: 'Nuestra Historia',
  nosotrosDesc: 'Más de 10 años creando experiencias inolvidables en Sechura, Piura. Conoce nuestra trayectoria, valores y equipo.',
};

/* ─────────────────────────────────────────────────────
   DEFAULTS COMPLETOS — se usan cuando Firestore no tiene
   el documento todavía (mismos valores que usa la web).
───────────────────────────────────────────────────── */
const DEFAULT_HERO = {
  eyebrow: 'J&M Decoraciones y Eventos',
  h1: 'Hacemos que cada celebración sea <em style="color:#f5c842;font-style:italic;">Mágica</em>',
  desc: 'Organizamos y diseñamos eventos personalizados para bodas, quinceaños, cumpleaños y fiestas temáticas.',
  btn1Text: 'Cotizar Ahora',
  btn1Link: '/contacto',
  btn2Text: 'Ver Servicios',
  btn2Link: '/#servicios',
};

const DEFAULT_STATS = {
  s1num: '+500', s1label: 'Fiestas exitosas', s1sub: 'Celebraciones realizadas',
  s2num: '10+', s2label: 'Años de experiencia', s2sub: 'Creando sonrisas',
  s3num: '100%', s3label: 'Diversión garantizada', s3sub: 'En cada evento',
  s4label: 'Servicios disponibles',
};

const DEFAULT_ABOUT = {
  label: 'Quiénes Somos',
  h2: 'Tu Evento en Manos de Expertos Creativos',
  p1: 'Somos una empresa apasionada por crear experiencias únicas e inolvidables.',
  p2: 'Creamos ambientes memorables con detalles únicos que sorprenden a tus invitados.',
  p3: '',
  badgeNum: '+10',
  badgeTxt: 'Años de Experiencia',
};

const DEFAULT_NAVBAR = {
  nombre: 'J&M Decoraciones y Eventos',
  tagline: 'Decoraciones & Eventos',
};

const DEFAULT_FOOTER = {
  legalName: 'J&M Decoraciones y Eventos',
  tagline: 'Sechura',
  desc: 'En cada evento, cuidamos cada detalle para que tú solo te encargues de disfrutar. Ofrecemos una gama completa de servicios para hacer de tu celebración una experiencia única.',
  quote: 'J&M Decoraciones y Eventos',
  foundedYear: '2018',
};

const DEFAULT_CONTACTO = {
  telefono: '+51 945 203 708',
  whatsapp: '51945203708',
  email: 'jmdecoracionesyeventossechura@gmail.com',
  direccion: 'Sechura, Piura, Perú',
  horario: 'Lunes a Domingo — 9am a 8pm',
  instagram: 'https://www.instagram.com/jmdecoracionesyeventos1/',
  facebook: 'https://www.facebook.com/JM.DecoracionesyEventosSechura1/',
  tiktok: 'https://www.tiktok.com/@jmdecoraciones.18',
  youtube: '',
  mapsLat: '-5.5566',
  mapsLng: '-80.8234',
};

const DEFAULT_WHATSAPP = {
  phoneNumber: '51945203708',
  primaryColor: '#085E54',
  buttonColor: '#1c9247',
  logoUrl: 'https://res.cloudinary.com/dvcmazqtp/image/upload/v1780101985/logos/feuzcxtlvcwov5fefinu.webp',
  promptText: '👋 Hola, resuelve la duda que tengas',
  promptDelay: 5,
  popupTitle: 'J&M Decoraciones y Eventos',
  popupSubtitle: 'Usualmente responde en 1 hora',
  welcomeText: '👋 Hola, ¿en qué podemos ayudarte?',
  customerText: 'Hola, quiero cotizar un evento',
};

const DEFAULT_NOSOTROS = {
  heroBadge: '✦ Sechura, Piura · Desde 2014',
  heroTitle1: 'Somos los que',
  heroHighlight: 'hacen magia',
  heroTitle3: 'en tu fiesta',
  heroDesc: 'Más de una década transformando celebraciones en experiencias únicas e inolvidables en Sechura, Piura.',
  sn1num: '+500', sn1label: 'Eventos realizados', sn1icon: '🎉',
  sn2num: '10+', sn2label: 'Años de trayectoria', sn2icon: '⭐',
  sn3num: '100%', sn3label: 'Satisfacción', sn3icon: '💎',
  sn4num: '6', sn4label: 'Servicios únicos', sn4icon: '🎭',
  histSubtitle: 'Nuestra trayectoria',
  histH2Gold: 'construyendo magia',
  histDesc: 'De un primer show infantil en Sechura a convertirnos en la empresa de eventos más completa de la región.',
  hitos: [
    { year: '2014', label: 'El Comienzo', desc: 'Primer show infantil en Sechura. Una familia, un sueño.', visible: true },
    { year: '2016', label: 'Primera Expansión', desc: 'Decoración temática, hora loca y fotografía al catálogo.', visible: true },
    { year: '2019', label: 'Mundo Corporativo', desc: 'Activaciones empresariales para grandes marcas de Piura.', visible: true },
    { year: '2024', label: 'Líderes Regionales', desc: '+500 eventos exitosos y la confianza de cientos de familias.', visible: true },
  ],
  valores: [
    { icon: '❤️', title: 'Pasión por los Detalles', desc: 'Cada elemento diseñado con amor para que tu evento sea irrepetible.', gradient: '#ff6b9d,#c44a7a', visible: true },
    { icon: '🎯', title: 'Compromiso Total', desc: 'Puntualidad, profesionalismo y resultados que superan las expectativas.', gradient: '#f59e0b,#d97706', visible: true },
    { icon: '✨', title: 'Creatividad sin Límites', desc: 'Experiencias adaptadas a tu visión, estilo y presupuesto.', gradient: '#8b5cf6,#6d28d9', visible: true },
    { icon: '🤝', title: 'Trato Familiar', desc: 'Te acompañamos como si fuéramos parte de tu familia.', gradient: '#10b981,#059669', visible: true },
    { icon: '🏆', title: 'Calidad Premium', desc: 'Materiales de primera y talento profesional en cada servicio.', gradient: '#3b82f6,#1d4ed8', visible: true },
    { icon: '🌟', title: 'Momentos Eternos', desc: 'No organizamos eventos, creamos recuerdos de por vida.', gradient: '#ec4899,#be185d', visible: true },
  ],
  misionSubtitle: 'Por qué existimos',
  misionH2: 'Creamos recuerdos que duran toda la vida',
  misionP1: 'En J&M Decoraciones y Eventos no solo organizamos celebraciones — diseñamos experiencias. Cada detalle está pensado para que tus invitados vivan momentos únicos.',
  misionP2: 'Más de una década en Sechura nos ha enseñado que la clave está en escuchar tus sueños y convertirlos en realidad.',
  misionCards: [
    { icon: '🎭', title: 'Shows con personajes únicos', desc: 'Animadores que hacen vivir los personajes favoritos de los niños.', visible: true },
    { icon: '🎨', title: 'Decoración de otra dimensión', desc: 'Cada espacio transformado en un mundo de fantasía y color personalizado.', visible: true },
    { icon: '📸', title: 'Momentos capturados para siempre', desc: 'Fotografía y video profesional de cada instante de tu celebración.', visible: true },
  ],
  ctaBadge: '¿Lista tu celebración?',
  ctaH2: 'Tu evento soñado comienza aquí',
  ctaDesc: 'Cuéntanos tu sueño y nos encargamos de cada detalle para que solo tengas que disfrutar.',
  ctaBtn1: '✨ Empezar a planear',
  ctaBtn1Url: '/contacto',
  ctaBtn2: '💬 Hablar por WhatsApp',
  ctaBtn2Url: 'https://wa.me/51945203708',
};

const DEFAULT_ANUNCIA = {
  heroBadge: 'Publicidad & Patrocinios',
  heroTitle1: 'Llega a miles de familias',
  heroTitleGold: 'que celebran',
  heroDesc: 'Conecta tu marca con una audiencia local comprometida: personas que están activamente planeando bodas, quinceañeras, cumpleaños y eventos corporativos.',
  heroCta: 'Ver planes de publicidad ↓',
  statsTitle: 'Nuestra audiencia en números',
  anunciaStats: [
    { icon: '👁️', value: 10000, suffix: '+', label: 'Visitas por mes', visible: true },
    { icon: '👨‍👩‍👧', value: 85, suffix: '%', label: 'Familias locales', visible: true },
    { icon: '⏱️', value: 3, suffix: ' min', label: 'Tiempo promedio en sitio', visible: true },
  ],
  benefitsBadge: 'Por qué anunciar aquí',
  benefitsTitle: 'Tu marca, en el momento exacto',
  anunciaBenefits: [
    { icon: '🎯', title: 'Audiencia segmentada', desc: 'Llegás directamente a personas que están buscando proveedores de eventos en tu zona.', visible: true },
    { icon: '✨', title: 'Presencia premium', desc: 'Tu marca se asocia con J&M Decoraciones y Eventos, una empresa reconocida por calidad y confianza.', visible: true },
    { icon: '📊', title: 'ROI medible', desc: 'Rastreamos las consultas generadas desde tu espacio publicitario para que puedas medir el impacto.', visible: true },
  ],
  tiersTitle: 'Planes de publicidad',
  anunciaTiers: [
    { icon: '🏷️', name: 'Básico', price: 'S/. 150', period: '/mes', cta: 'Empezar', features: ['Logo en el footer del sitio', 'Mención mensual en redes sociales', 'Enlace a tu negocio'], popular: false, visible: true },
    { icon: '⭐', name: 'Destacado', price: 'S/. 350', period: '/mes', cta: 'Elegir Destacado', features: ['Banner en la página principal', 'Mención en sección de galería', 'Badge "Partner Verificado"', 'Logo en footer + redes sociales'], popular: true, visible: true },
    { icon: '💎', name: 'Premium', price: 'S/. 750', period: '/mes', cta: 'Contactar', features: ['Todo lo del plan Destacado', 'Página propia de partner', 'Featured en sección de servicios', 'Reportes mensuales de alcance', 'Soporte prioritario'], popular: false, visible: true },
  ],
  ctaTitle: '¿Interesado? Conversemos',
  ctaDesc: 'Cuéntanos sobre tu negocio y te ayudamos a elegir el plan ideal. Sin compromisos — solo una charla rápida.',
  ctaBtn1: '✉️ Enviar propuesta',
  ctaBtn1Url: '/contacto',
  ctaBtn2: '💬 WhatsApp',
  ctaBtn2Url: 'https://wa.me/51945203708',
};

const DEFAULT_LEGAL = {
  privacidad: [
    { title: '1. Responsable del Tratamiento', content: 'J&M Decoraciones y Eventos, con domicilio en Sechura, Piura, Perú, es responsable del tratamiento de los datos personales recabados a través de este sitio web.' },
    { title: '2. Datos que Recopilamos', content: 'Recopilamos nombre, teléfono y correo electrónico cuando envías un formulario de contacto o cotización. No recopilamos datos de pago ni información sensible.' },
    { title: '3. Uso de los Datos', content: 'Los datos son utilizados exclusivamente para responder tu consulta, preparar cotizaciones y brindarte información sobre nuestros servicios. No los vendemos ni cedemos a terceros.' },
    { title: '4. Tus Derechos', content: 'Puedes solicitar acceso, rectificación o eliminación de tus datos contactándonos a jmdecoracionesyeventossechura@gmail.com o por WhatsApp al +51 945 203 708.' },
  ],
  terminos: [
    { title: '1. Aceptación de Términos', content: 'Al utilizar este sitio web, aceptas los presentes Términos del Servicio. Si no estás de acuerdo, te pedimos que no utilices nuestros servicios.' },
    { title: '2. Servicios Ofrecidos', content: 'J&M Decoraciones y Eventos ofrece servicios de organización, decoración y animación de eventos en Sechura, Piura y alrededores. Los precios y disponibilidad están sujetos a cambios.' },
    { title: '3. Cotizaciones y Reservas', content: 'Las cotizaciones son válidas por 7 días. La reserva del servicio requiere un adelanto del 50% del total acordado. El saldo restante se abona el día del evento.' },
    { title: '4. Cancelaciones', content: 'Cancelaciones con más de 72 horas de anticipación: reembolso del 80% del adelanto. Cancelaciones con menos de 72 horas: sin reembolso del adelanto.' },
    { title: '5. Responsabilidades', content: 'J&M Decoraciones y Eventos no se hace responsable por daños causados por terceros, condiciones climáticas extremas u otros factores de fuerza mayor que impidan la realización del evento.' },
  ],
  cookies: [
    { title: '1. ¿Qué son las Cookies?', content: 'Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web. Nos ayudan a mejorar tu experiencia de navegación.' },
    { title: '2. Cookies que Utilizamos', content: 'Utilizamos cookies técnicas necesarias para el funcionamiento del sitio (sesión, preferencias) y cookies analíticas para entender cómo los usuarios interactúan con la web.' },
    { title: '3. Gestión de Cookies', content: 'Puedes configurar tu navegador para rechazar todas las cookies o para que te avise cuando se envíe una cookie. Ten en cuenta que algunas funciones del sitio pueden no funcionar correctamente sin cookies.' },
  ],
};

/* ─────────────────────────────────────────────────────
   Label helper
───────────────────────────────────────────────────── */
const lbl = (text: string) => (
  <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
    {text}
  </label>
);

/* ─────────────────────────────────────────────────────
   F — Field (outside component to avoid remounts)
───────────────────────────────────────────────────── */
function F({ label: lb, fieldKey, type = 'text', placeholder = '', rows = 3, value, onChange }: {
  label: string; fieldKey: string; type?: string; placeholder?: string; rows?: number;
  value: string; onChange: (k: string, v: string) => void;
}) {
  return (
    <div>
      {lbl(lb)}
      {type === 'textarea'
        ? <textarea rows={rows} value={value} onChange={e => onChange(fieldKey, e.target.value)}
          placeholder={placeholder} className="admin-input" style={{ resize: 'vertical' }} />
        : <input type={type} value={value} onChange={e => onChange(fieldKey, e.target.value)}
          placeholder={placeholder} className="admin-input" />
      }
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ItemCard — row with Edit / Hide / Delete
   Muestra thumbnail (imagen/video) cuando el ítem tiene
   logoUrl, mediaSrc, avatar o url. Si no, muestra emoji.
   Si tiene gradient (valores), muestra swatch de color.
───────────────────────────────────────────────────── */
function ItemCard({ item, onEdit, onToggle, onDelete }: {
  item: any; onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const hidden = item.visible === false;
  const mediaUrl = item.logoUrl || item.mediaSrc || item.avatar || item.url || '';
  const isVideo = (item.mediaType === 'video')
    || (!!mediaUrl && /\.(mp4|webm|mov)/i.test(mediaUrl.split('?')[0]));
  const emoji = item.icon || item.logo || '';
  // logos (logoUrl) se muestran con contain; avatares/media con cover
  const fit = item.logoUrl ? 'contain' : 'cover';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', borderRadius: 10,
      padding: '0.75rem 1rem', border: '1px solid #e2e8f0',
      opacity: hidden ? 0.55 : 1, transition: 'opacity .2s'
    }}>

      {/* ── thumbnail ── */}
      {mediaUrl ? (
        <div style={{
          width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
          background: fit === 'contain' ? '#fff' : 'linear-gradient(135deg,#1e3a5f,#2563eb)',
          border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {isVideo
            ? <video src={mediaUrl} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <img src={mediaUrl} alt={item.name || item.title || ''}
              style={{ width: '100%', height: '100%', objectFit: fit }} />}
        </div>
      ) : emoji ? (
        <span style={{ fontSize: '1.3rem', width: 38, textAlign: 'center', flexShrink: 0, lineHeight: 1 }}>{emoji}</span>
      ) : item.gradient ? (
        /* valores — swatch */
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg,${item.gradient})`,
          border: '1px solid rgba(0,0,0,0.06)'
        }} />
      ) : (
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: '#e2e8f0'
        }} />
      )}

      {/* ── text ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontWeight: 600, fontSize: '0.88rem', color: '#0a1628', margin: '0 0 2px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {/* cuando hay imagen Y emoji, muestra el emoji dentro del título */}
          {mediaUrl && emoji ? <span style={{ marginRight: 5 }}>{emoji}</span> : null}
          {item.title || item.label || item.name ||
            <span style={{ color: '#94a3b8', fontWeight: 400 }}>Sin título</span>}
          {item.year &&
            <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.78rem', marginLeft: 6 }}>
              {item.year}
            </span>}
        </p>
        {(item.desc || item.text) && (
          <p style={{
            fontSize: '0.75rem', color: '#64748b', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {item.desc || item.text}
          </p>
        )}
      </div>

      {hidden &&
        <span style={{
          fontSize: '0.62rem', background: '#f1f5f9', color: '#94a3b8',
          borderRadius: 4, padding: '2px 6px', flexShrink: 0, whiteSpace: 'nowrap'
        }}>
          Oculto
        </span>}

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} title="Editar"
          style={{
            background: 'none', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px',
            cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center'
          }}>
          <Edit2 size={14} />
        </button>
        <button onClick={onToggle} title={hidden ? 'Mostrar' : 'Ocultar'}
          style={{
            background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px',
            cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center'
          }}>
          {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button onClick={onDelete} title="Eliminar"
          style={{
            background: 'none', border: '1px solid #fecaca', borderRadius: 8, padding: '6px',
            cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center'
          }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   StatCard — for Stats & Nosotros stats
───────────────────────────────────────────────────── */
function StatCard({ num, label, secondary, index, onEdit }: {
  num: string; label: string; secondary?: string; index: number; onEdit: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f8fafc', borderRadius: 10, padding: '0.875rem 1rem', border: '1px solid #e2e8f0' }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f5c842', fontWeight: 800, fontSize: '1rem', flexShrink: 0, textAlign: 'center', padding: '0 4px' }}>
        {num || `#${index}`}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0a1628', margin: '0 0 2px' }}>{label || <span style={{ color: '#94a3b8' }}>Sin etiqueta</span>}</p>
        {secondary && <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>{secondary}</p>}
      </div>
      <button onClick={onEdit} title="Editar"
        style={{ background: 'none', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 500 }}>
        <Edit2 size={13} /> Editar
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Section types
───────────────────────────────────────────────────── */
type Section = 'hero' | 'stats' | 'about' | 'nosotros' | 'why-us' | 'brands' | 'contacto' | 'navbar' | 'testimonios' | 'footer' | 'whatsapp' | 'anuncia' | 'legal' | 'seo';

const SECTIONS: { id: Section; icon: string; label: string; group?: string }[] = [
  /* ── Página principal ── */
  { id: 'hero', icon: '🖼️', label: 'Hero / Portada', group: 'Inicio' },
  { id: 'stats', icon: '📊', label: 'Estadísticas', group: 'Inicio' },
  { id: 'why-us', icon: '✨', label: '¿Por qué elegirnos?', group: 'Inicio' },
  { id: 'brands', icon: '🏢', label: 'Empresas / Marcas', group: 'Inicio' },
  { id: 'about', icon: '👥', label: 'Quiénes Somos', group: 'Inicio' },
  /* ── Páginas ── */
  { id: 'nosotros', icon: '🏠', label: 'Sobre Nosotros', group: 'Páginas' },
  { id: 'anuncia', icon: '📢', label: 'Anuncia con Nosotros', group: 'Páginas' },
  /* ── Globales ── */
  { id: 'navbar', icon: '🧭', label: 'Navbar / Logo', group: 'Global' },
  { id: 'footer', icon: '🦶', label: 'Footer', group: 'Global' },
  { id: 'contacto', icon: '📞', label: 'Contacto y Redes', group: 'Global' },
  { id: 'whatsapp', icon: '💬', label: 'WhatsApp Widget', group: 'Global' },
  { id: 'seo', icon: '🔍', label: 'SEO / Metadatos', group: 'Global' },
  /* ── Contenido ── */
  { id: 'testimonios', icon: '⭐', label: 'Testimonios', group: 'Contenido' },
  /* ── Legal ── */
  { id: 'legal', icon: '⚖️', label: 'Páginas Legales', group: 'Legal' },
];

/* ─────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────── */
export default function ConfiguracionPage() {
  const [section, setSection] = useState<Section>(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('s');
      if (q && SECTIONS.some(s => s.id === q)) return q as Section;
    }
    return 'hero';
  });
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /* Flag para saber si la sección muestra datos de ejemplo (nunca guardados) */
  const [isDefaults, setIsDefaults] = useState(false);

  /* Conteo automático de servicios visibles */
  const [servicesCount, setServicesCount] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, COL.SERVICIOS), where('visible', '==', true)),
      snap => setServicesCount(snap.size)
    );
    return unsub;
  }, []);

  /* Testimonios */
  const [testimonios, setTestimonios] = useState<any[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testModal, setTestModal] = useState<{ id: string | null; form: any } | null>(null);

  /* Legal sub-tab */
  const [legalTab, setLegalTab] = useState<'privacidad' | 'terminos' | 'cookies'>('privacidad');

  /* Generic list modal (why-us items, hitos, valores, misionCards, brands) */
  const [editModal, setEditModal] = useState<{
    listKey: string;
    index: number | null;
    form: any;
  } | null>(null);

  /* Stats modal (main stats + nosotros stats) */
  const [statsModal, setStatsModal] = useState<{
    type: 'main' | 'nosotros';
    n: number; // 1–4
    form: Record<string, string>;
  } | null>(null);

  const { open } = useModal();

  /* ── Load section doc ── */
  useEffect(() => {
    if (section === 'testimonios') { setLoading(false); setIsDefaults(false); return; }
    setLoading(true);
    setIsDefaults(false);
    setData({});
    getDoc(doc(db, COL.CONFIGURACION, section)).then(snap => {
      let loaded: Record<string, any> = snap.exists() ? snap.data() : {};
      let usedDefaults = false;

      if (!snap.exists()) {
        /* Primera vez que se abre la sección: pre-cargar con los mismos
           valores que la web usa como fallback, para que los campos
           muestren contenido real en lugar de estar vacíos. */
        const SECTION_DEFAULTS: Record<string, Record<string, any>> = {
          'hero': DEFAULT_HERO,
          'stats': DEFAULT_STATS,
          'about': DEFAULT_ABOUT,
          'why-us': { h2: '¿Por qué <em>elegirnos</em>?', desc: 'Más de una década transformando celebraciones en Sechura, Piura.', items: DEFAULT_WHY_ITEMS },
          'brands': { h2: 'Empresas que confían en nosotros', brands: DEFAULT_BRANDS },
          'navbar': DEFAULT_NAVBAR,
          'footer': DEFAULT_FOOTER,
          'contacto': DEFAULT_CONTACTO,
          'whatsapp': DEFAULT_WHATSAPP,
          'nosotros': DEFAULT_NOSOTROS,
          'anuncia': DEFAULT_ANUNCIA,
          'legal': DEFAULT_LEGAL,
          'seo': DEFAULT_SEO,
        };
        if (SECTION_DEFAULTS[section]) {
          loaded = { ...SECTION_DEFAULTS[section] };
          usedDefaults = true;
        }
      } else {
        /* Documento ya existe: rellenar solo los arrays vacíos */
        if (section === 'why-us' && (!loaded.items || loaded.items.length === 0)) {
          loaded.items = DEFAULT_WHY_ITEMS;
        }
        if (section === 'brands' && (!loaded.brands || loaded.brands.length === 0)) {
          loaded.brands = DEFAULT_BRANDS;
        }
      }

      setIsDefaults(usedDefaults);
      setData(loaded);
      setLoading(false);
    });
  }, [section]);

  /* ── Load testimonios ── */
  useEffect(() => {
    if (section !== 'testimonios') return;
    setTestLoading(true);
    return onSnapshot(
      query(collection(db, COL.TESTIMONIOS), orderBy('order', 'asc')),
      snap => { setTestimonios(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setTestLoading(false); }
    );
  }, [section]);

  /* ── Setters ── */
  const set = useCallback((k: string, v: any) => setData(p => ({ ...p, [k]: v })), []);
  const handleField = useCallback((k: string, v: string) => set(k, v), [set]);

  /* ── Save section ── */
  const handleSave = async () => {
    setSaving(true);
    let saveData = { ...data };
    if (servicesCount !== null) {
      if (section === 'stats') saveData = { ...saveData, s4num: String(servicesCount) };
      if (section === 'nosotros') saveData = { ...saveData, sn4num: String(servicesCount) };
    }
    await setDoc(doc(db, COL.CONFIGURACION, section), saveData, { merge: true });
    setSaving(false);
    setIsDefaults(false);
    toast.success('✅ Guardado. Los cambios ya están en la web.');
  };

  /* ─────────────────────────────────────────────────────
     Generic list helpers
  ───────────────────────────────────────────────────── */
  const getList = (key: string) => data[key] || [];

  const openEdit = (listKey: string, idx: number) =>
    setEditModal({ listKey, index: idx, form: { ...getList(listKey)[idx] } });

  const openAdd = (listKey: string, def: any) =>
    setEditModal({ listKey, index: null, form: { ...def, visible: true } });

  const saveFromModal = () => {
    if (!editModal) return;
    const { listKey, index, form } = editModal;
    if (listKey === 'legalSections') {
      const items = [...(data[legalTab] || [])];
      if (index === null) items.push(form); else items[index] = form;
      set(legalTab, items);
    } else {
      const items = [...getList(listKey)];
      if (index === null) items.push(form); else items[index] = form;
      set(listKey, items);
    }
    setEditModal(null);
  };

  const toggleVisible = (listKey: string, i: number) => {
    const items = [...getList(listKey)];
    items[i] = { ...items[i], visible: items[i].visible === false };
    set(listKey, items);
  };

  const deleteItem = (listKey: string, i: number) => open({
    type: 'delete', title: 'Eliminar elemento', description: 'Esta acción no se puede deshacer.',
    onConfirm: async () => set(listKey, getList(listKey).filter((_: any, j: number) => j !== i)),
  });

  const setMF = (k: string, v: any) =>
    setEditModal(p => p ? { ...p, form: { ...p.form, [k]: v } } : null);

  /* ─────────────────────────────────────────────────────
     Stats modal helpers
  ───────────────────────────────────────────────────── */
  const openStatsEdit = (type: 'main' | 'nosotros', n: number) => {
    const p = type === 'main' ? 's' : 'sn';
    setStatsModal({
      type, n,
      form: {
        num: data[`${p}${n}num`] || '',
        label: data[`${p}${n}label`] || '',
        ...(type === 'main'
          ? { sub: data[`s${n}sub`] || '' }
          : { icon: data[`sn${n}icon`] || '' }),
      },
    });
  };

  const saveStatsModal = () => {
    if (!statsModal) return;
    const { type, n, form } = statsModal;
    const p = type === 'main' ? 's' : 'sn';
    set(`${p}${n}num`, form.num);
    set(`${p}${n}label`, form.label);
    if (type === 'main') set(`s${n}sub`, form.sub || '');
    else set(`sn${n}icon`, form.icon || '');
    setStatsModal(null);
  };

  const setSMF = (k: string, v: string) =>
    setStatsModal(p => p ? { ...p, form: { ...p.form, [k]: v } } : null);

  /* ─────────────────────────────────────────────────────
     Modal fields renderer (generic lists)
  ───────────────────────────────────────────────────── */
  const renderModalFields = () => {
    if (!editModal) return null;
    const { listKey, form } = editModal;

    const mi = (lb: string, k: string, ph = '', emoji = false) => (
      <div key={k}>
        {lbl(lb)}
        <input type="text" value={form[k] || ''} onChange={e => setMF(k, e.target.value)}
          placeholder={ph} className="admin-input"
          style={emoji ? { textAlign: 'center', fontSize: '1.4rem', padding: '0.35rem', width: 60 } : {}} />
      </div>
    );
    const mt = (lb: string, k: string, ph = '', rows = 3) => (
      <div key={k}>
        {lbl(lb)}
        <textarea rows={rows} value={form[k] || ''} onChange={e => setMF(k, e.target.value)}
          placeholder={ph} className="admin-input" style={{ resize: 'vertical' }} />
      </div>
    );
    const mv = () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <span style={{ fontSize: '0.84rem', color: '#475569', flex: 1 }}>Visible en la web</span>
        <button type="button" onClick={() => setMF('visible', form.visible === false)}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
            background: form.visible !== false ? '#10b981' : '#e2e8f0', transition: 'background .2s'
          }}>
          <div style={{
            width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 2,
            left: form.visible !== false ? 22 : 2, transition: 'left .2s'
          }} />
        </button>
      </div>
    );

    switch (listKey) {
      case 'items':
        return (<>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            {mi('Ícono', 'icon', '🏆', true)}
            <div style={{ flex: 1 }}>{mi('Título', 'title', 'Experiencia Comprobada')}</div>
          </div>
          {mt('Descripción', 'desc', 'Más de 10 años...', 2)}
          {mv()}
        </>);
      case 'hitos':
        return (<>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 12 }}>
            {mi('Año', 'year', '2014')}
            {mi('Título del hito', 'label', 'El Comienzo')}
          </div>
          {mt('Descripción', 'desc', 'Cómo comenzó todo...', 2)}
          {mv()}
        </>);
      case 'valores':
        return (<>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            {mi('Ícono', 'icon', '❤️', true)}
            <div style={{ flex: 1 }}>{mi('Título', 'title', 'Pasión')}</div>
          </div>
          {mt('Descripción', 'desc', 'Descripción del valor...', 2)}
          {mi('Gradiente CSS (ej: #f59e0b,#d97706)', 'gradient', '#f59e0b,#d97706')}
          {mv()}
        </>);
      case 'misionCards':
        return (<>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            {mi('Ícono', 'icon', '🎭', true)}
            <div style={{ flex: 1 }}>{mi('Título', 'title', 'Título')}</div>
          </div>
          {mt('Descripción', 'desc', 'Descripción...', 2)}
          {mv()}
        </>);
      case 'brands':
        return (<>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            {mi('Logo emoji', 'logo', '🏢', true)}
            <div style={{ flex: 1 }}>{mi('Nombre empresa', 'name', 'Nombre de la empresa')}</div>
          </div>
          <ImageUploader label="Logo imagen (opcional)" folder="brands" acceptVideo={false}
            value={form.logoUrl}
            previewAspect={1} previewLabel="Logo en tarjeta (cuadrado 40×40)"
            onComplete={(url) => setMF('logoUrl', url)} />
          {mv()}
        </>);
      case 'anunciaStats':
        return (<>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            {mi('Ícono', 'icon', '👁️', true)}
            <div style={{ flex: 1 }}>
              {lbl('Valor numérico')}
              <input type="number" value={form.value || ''} onChange={e => setMF('value', Number(e.target.value))}
                placeholder="10000" className="admin-input" />
            </div>
            <div style={{ width: 80 }}>{mi('Sufijo', 'suffix', '+')}</div>
          </div>
          {mi('Etiqueta', 'label', 'Visitas por mes')}
          {mv()}
        </>);
      case 'anunciaBenefits':
        return (<>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            {mi('Ícono', 'icon', '🎯', true)}
            <div style={{ flex: 1 }}>{mi('Título', 'title', 'Audiencia segmentada')}</div>
          </div>
          {mt('Descripción', 'desc', 'Llegás directamente a personas...', 3)}
          {mv()}
        </>);
      case 'anunciaTiers':
        return (<>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: 12, alignItems: 'end' }}>
            {mi('Ícono', 'icon', '⭐', true)}
            {mi('Nombre', 'name', 'Destacado')}
            {mi('CTA botón', 'cta', 'Elegir')}
          </div>
          <div className="cfg-2col" style={{ gap: 12 }}>
            {mi('Precio', 'price', 'S/. 350')}
            {mi('Período', 'period', '/mes')}
          </div>
          <div>
            {lbl('Características (una por línea)')}
            <textarea rows={5} value={(form.features || []).join('\n')} className="admin-input" style={{ resize: 'vertical' }}
              onChange={e => setMF('features', e.target.value.split('\n'))}
              placeholder={'Logo en footer\nMención en redes\nEnlace a tu negocio'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.84rem', color: '#475569', flex: 1 }}>¿Plan más popular? (badge dorado)</span>
            <button type="button" onClick={() => setMF('popular', !form.popular)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
                background: form.popular ? '#f59e0b' : '#e2e8f0', transition: 'background .2s'
              }}>
              <div style={{
                width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 2,
                left: form.popular ? 22 : 2, transition: 'left .2s'
              }} />
            </button>
          </div>
          {mv()}
        </>);
      case 'legalSections':
        return (<>
          {mi('Título', 'title', '1. Responsable del Tratamiento')}
          {mt('Contenido', 'content', 'Descripción de esta sección...', 6)}
        </>);
      default:
        return null;
    }
  };

  /* ─────────────────────────────────────────────────────
     Testimonios CRUD
  ───────────────────────────────────────────────────── */
  const saveTestimonio = async () => {
    if (!testModal) return;
    const { id, form } = testModal;
    if (!form.name?.trim() || !form.text?.trim()) { toast.error('Nombre y testimonio son obligatorios'); return; }
    if (id) {
      await updateDoc(doc(db, COL.TESTIMONIOS, id), {
        name: form.name, role: form.role || 'Cliente', text: form.text, stars: form.stars || 5,
        ...(form.avatar ? { avatar: form.avatar, focalX: form.focalX ?? 0.5, focalY: form.focalY ?? 0.5 } : {}),
      });
      toast.success('Testimonio actualizado');
    } else {
      const nid = `${Date.now()}`;
      await setDoc(doc(db, COL.TESTIMONIOS, nid), {
        name: form.name, role: form.role || 'Cliente', text: form.text,
        stars: form.stars || 5, avatar: form.avatar || '',
        focalX: form.focalX ?? 0.5, focalY: form.focalY ?? 0.5,
        order: testimonios.length + 1, visible: true, createdAt: new Date().toISOString(),
      });
      toast.success('Testimonio agregado');
    }
    setTestModal(null);
  };

  const toggleTestVisible = (item: any) => open({
    type: item.visible ? 'hide' : 'show',
    title: item.visible ? 'Ocultar testimonio' : 'Mostrar testimonio',
    description: item.visible ? 'Dejará de verse en la web.' : 'Volverá a aparecer en la web.',
    collection: COL.TESTIMONIOS, docId: item.id, field: 'visible',
  });

  const deleteTestimonio = (item: any) => open({
    type: 'delete', title: `Eliminar testimonio de "${item.name}"`,
    description: 'Esta acción no se puede deshacer.',
    onConfirm: async () => { await deleteDoc(doc(db, COL.TESTIMONIOS, item.id)); toast.success('Eliminado'); },
  });

  /* ─────────────────────────────────────────────────────
     List section header helper
  ───────────────────────────────────────────────────── */
  const ListHeader = ({ lb, count, listKey, def }: { lb: string; count: number; listKey: string; def: any }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      {lbl(`${lb} (${count})`)}
      <button onClick={() => openAdd(listKey, def)} className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>+ Agregar</button>
    </div>
  );

  /* ─────────────────────────────────────────────────────
     Sidebar button
  ───────────────────────────────────────────────────── */
  const SideBtn = ({ s }: { s: typeof SECTIONS[0] }) => (
    <button onClick={() => setSection(s.id)} className="cfg-side-btn"
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '0.45rem 0.65rem',
        borderRadius: 9, border: section === s.id ? '1px solid rgba(30,58,95,.2)' : '1px solid transparent',
        cursor: 'pointer', fontFamily: 'var(--font-jakarta)', whiteSpace: 'nowrap', flexShrink: 0,
        fontSize: '0.78rem', fontWeight: section === s.id ? 600 : 400,
        background: section === s.id ? 'rgba(30,58,95,.08)' : 'transparent',
        color: section === s.id ? '#1e3a5f' : '#64748b'
      }}>
      <span style={{ fontSize: '0.85rem' }}>{s.icon}</span><span>{s.label}</span>
    </button>
  );

  /* ═══════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════ */
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', fontWeight: 700, color: '#0a1628', margin: 0 }}>Configuración</h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 4 }}>Todos los cambios se sincronizan con la web pública</p>
        </div>
        {section !== 'testimonios' && (
          <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Guardando…' : '💾 Guardar sección'}
          </button>
        )}
      </div>

      <div className="cfg-layout">

        {/* Left sidebar */}
        <div className="cfg-sidebar">
          {(() => {
            const groups = [...new Set(SECTIONS.map(s => s.group || ''))];
            return groups.map(g => (
              <div key={g} style={{ marginBottom: '0.75rem' }}>
                <p style={{
                  fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em',
                  color: '#94a3b8', padding: '0 0.5rem', marginBottom: '0.2rem', margin: '0 0 4px 8px'
                }}>
                  {g}
                </p>
                {SECTIONS.filter(s => (s.group || '') === g).map(s => <SideBtn key={s.id} s={s} />)}
              </div>
            ));
          })()}
        </div>

        {/* Content panel */}
        <div className="admin-card cfg-content-card" style={{ flex: 1, padding: '1.5rem', minWidth: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />)}
            </div>
          ) : (
            <>
              {/* Banner global — datos de ejemplo (sección aún no guardada) */}
              {isDefaults && section !== 'why-us' && section !== 'brands' && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 18 }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💡</span>
                  <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0 }}>
                    Estás viendo el <strong>contenido actual de la web pública</strong> — esta sección aún no está guardada en la base de datos. Edita lo que necesites y haz clic en <strong>Guardar sección</strong> para publicar los cambios.
                  </p>
                </div>
              )}

              {/* ══════════ HERO ══════════ */}
              {section === 'hero' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Media actual establecida */}
                  {data.bgImage && (
                    <div style={{ borderRadius: 12, overflow: 'hidden', position: 'relative', height: 120, background: '#0a1628' }}>
                      {data.bgMediaType === 'video'
                        ? <video src={data.bgImage} muted autoPlay loop playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .7 }} />
                        : <img src={data.bgImage} alt="Fondo hero"
                          style={{
                            width: '100%', height: '100%', objectFit: 'cover', opacity: .7,
                            objectPosition: `${(data.bgFocalX ?? 0.5) * 100}% ${(data.bgFocalY ?? 0.4) * 100}%`
                          }} />}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,22,40,.7) 0%, transparent 60%)' }} />
                      <div style={{ position: 'absolute', bottom: 10, left: 14 }}>
                        <span style={{
                          background: 'rgba(0,0,0,.65)', color: '#fff', fontSize: '0.65rem',
                          padding: '2px 10px', borderRadius: 999, fontWeight: 600
                        }}>
                          {data.bgMediaType === 'video' ? '🎬 Video de fondo activo' : '🖼️ Imagen de fondo activa'}
                        </span>
                      </div>
                    </div>
                  )}
                  <F label="Eyebrow (texto sobre el H1)" fieldKey="eyebrow" value={data.eyebrow || ''} onChange={handleField} placeholder="Organizamos tu momento especial" />
                  <F label='H1 — usa <em>texto</em> para color dorado' fieldKey="h1" value={data.h1 || ''} onChange={handleField} placeholder='Eventos que dejan <em>huella</em>' />
                  <F label="Descripción" fieldKey="desc" value={data.desc || ''} onChange={handleField} type="textarea" rows={3} placeholder="Somos expertos en transformar cada celebración..." />
                  <div className="cfg-2col" style={{ gap: 16 }}>
                    <F label="Texto botón 1" fieldKey="btn1Text" value={data.btn1Text || ''} onChange={handleField} placeholder="Ver Servicios" />
                    <F label="URL botón 1" fieldKey="btn1Link" value={data.btn1Link || ''} onChange={handleField} placeholder="/#servicios" />
                    <F label="Texto botón 2" fieldKey="btn2Text" value={data.btn2Text || ''} onChange={handleField} placeholder="Cotizar por WhatsApp" />
                    <F label="URL botón 2" fieldKey="btn2Link" value={data.btn2Link || ''} onChange={handleField} placeholder="https://wa.me/51945203708" />
                  </div>
                  <ImageUploader label="Imagen/Video de fondo (máx 200MB)" folder="configuracion/hero"
                    value={data.bgImage} focal={{ x: data.bgFocalX ?? 0.5, y: data.bgFocalY ?? 0.4 }} acceptVideo={true}
                    soundEnabled={!!data.bgVideoSound} onSound={v => set('bgVideoSound', v)}
                    previewAspect={16 / 9} previewLabel="Banner hero (pantalla completa)"
                    onComplete={(url, fp, type) => { set('bgImage', url); set('bgFocalX', fp.x); set('bgFocalY', fp.y); set('bgMediaType', type || 'image'); }} />
                </div>
              )}

              {/* ══════════ STATS ══════════ */}
              {section === 'stats' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '0.75rem 1rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#166534', margin: 0 }}>💡 Haz clic en "Editar" para modificar cada contador. Los cambios se guardan al presionar "Guardar sección".</p>
                  </div>
                  {[1, 2, 3].map(n => (
                    <StatCard key={n} index={n}
                      num={data[`s${n}num`] || ''}
                      label={data[`s${n}label`] || ''}
                      secondary={data[`s${n}sub`] || ''}
                      onEdit={() => openStatsEdit('main', n)} />
                  ))}
                  {/* Stat #4: Servicios disponibles — auto-calculado */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, background: '#eff6ff', borderRadius: 10,
                    padding: '0.75rem 1rem', border: '1px solid #bfdbfe'
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', background: '#1d4ed8', color: '#fff',
                      fontWeight: 800, fontSize: '1.1rem'
                    }}>
                      {servicesCount ?? data.s4num ?? '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0a1628', margin: '0 0 2px' }}>
                        {data.s4label || 'Servicios disponibles'}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: '#3b82f6', margin: 0 }}>
                        🔄 Se actualiza automáticamente según los servicios activos
                      </p>
                    </div>
                    <span style={{
                      fontSize: '0.65rem', background: '#dbeafe', color: '#1d4ed8',
                      borderRadius: 6, padding: '3px 8px', fontWeight: 700
                    }}>
                      AUTO
                    </span>
                  </div>
                </div>
              )}

              {/* ══════════ ABOUT ══════════ */}
              {section === 'about' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Miniaturas de las imágenes/videos establecidos */}
                  {(data.img1 || data.img2) && (
                    <div style={{ display: 'grid', gridTemplateColumns: data.img1 && data.img2 ? '1fr 1fr' : '1fr', gap: 10 }}>
                      {data.img1 && (
                        <div style={{ borderRadius: 10, overflow: 'hidden', position: 'relative', aspectRatio: '3/4', background: '#0a1628', maxHeight: 160 }}>
                          {data.img1Type === 'video'
                            ? <video src={data.img1} muted autoPlay loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .8 }} />
                            : <img src={data.img1} alt="Foto principal" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: data.img1Pos || 'center', opacity: .85 }} />}
                          <span style={{ position: 'absolute', bottom: 6, left: 8, background: 'rgba(0,0,0,.65)', color: '#fff', fontSize: '0.6rem', padding: '2px 8px', borderRadius: 999 }}>
                            {data.img1Type === 'video' ? '🎬' : '🖼️'} Principal
                          </span>
                        </div>
                      )}
                      {data.img2 && (
                        <div style={{ borderRadius: 10, overflow: 'hidden', position: 'relative', aspectRatio: '4/3', background: '#0a1628', maxHeight: 160 }}>
                          {data.img2Type === 'video'
                            ? <video src={data.img2} muted autoPlay loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .8 }} />
                            : <img src={data.img2} alt="Foto secundaria" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: data.img2Pos || 'center', opacity: .85 }} />}
                          <span style={{ position: 'absolute', bottom: 6, left: 8, background: 'rgba(0,0,0,.65)', color: '#fff', fontSize: '0.6rem', padding: '2px 8px', borderRadius: 999 }}>
                            {data.img2Type === 'video' ? '🎬' : '🖼️'} Secundaria
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <F label="Badge / etiqueta" fieldKey="label" value={data.label || ''} onChange={handleField} placeholder="Quiénes Somos" />
                  <F label="Título H2" fieldKey="h2" value={data.h2 || ''} onChange={handleField} placeholder="Tu Evento en Manos de Expertos" />
                  <F label="Párrafo 1" fieldKey="p1" value={data.p1 || ''} onChange={handleField} type="textarea" rows={3} placeholder="Somos una empresa especializada en..." />
                  <F label="Párrafo 2" fieldKey="p2" value={data.p2 || ''} onChange={handleField} type="textarea" rows={3} placeholder="Con más de una década de experiencia..." />
                  <F label="Párrafo 3" fieldKey="p3" value={data.p3 || ''} onChange={handleField} type="textarea" rows={3} placeholder="Nuestro compromiso con la calidad..." />
                  <div className="cfg-2col" style={{ gap: 16 }}>
                    <F label="Número del badge (ej: +10)" fieldKey="badgeNum" value={data.badgeNum || ''} onChange={handleField} placeholder="+10" />
                    <F label="Texto del badge" fieldKey="badgeTxt" value={data.badgeTxt || ''} onChange={handleField} placeholder="Años de Experiencia" />
                  </div>
                  <div className="cfg-2col" style={{ gap: 20 }}>
                    <ImageUploader label="Imagen / Video principal" folder="configuracion/about"
                      value={data.img1} focal={{ x: 0.5, y: 0.4 }} acceptVideo={true}
                      soundEnabled={!!data.img1Sound} onSound={v => set('img1Sound', v)}
                      previewAspect={3 / 4} previewLabel="Foto grande (retrato 3:4)"
                      onComplete={(url, fp, type) => { set('img1', url); set('img1Pos', `${fp.x * 100}% ${fp.y * 100}%`); set('img1Type', type || 'image'); }} />
                    <ImageUploader label="Imagen / Video secundaria" folder="configuracion/about"
                      value={data.img2} focal={{ x: 0.5, y: 0.4 }} acceptVideo={true}
                      soundEnabled={!!data.img2Sound} onSound={v => set('img2Sound', v)}
                      previewAspect={4 / 3} previewLabel="Foto flotante (paisaje 4:3)"
                      onComplete={(url, fp, type) => { set('img2', url); set('img2Pos', `${fp.x * 100}% ${fp.y * 100}%`); set('img2Type', type || 'image'); }} />
                  </div>
                </div>
              )}

              {/* ══════════ NOSOTROS ══════════ */}
              {section === 'nosotros' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                  {/* Hero */}
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Hero</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <F label="Badge" fieldKey="heroBadge" value={data.heroBadge || ''} onChange={handleField} placeholder="Sechura, Piura · Desde 2014" />
                      <F label="Título línea 1" fieldKey="heroTitle1" value={data.heroTitle1 || ''} onChange={handleField} placeholder="Somos los que" />
                      <F label="Título destacado (dorado)" fieldKey="heroHighlight" value={data.heroHighlight || ''} onChange={handleField} placeholder="hacen magia" />
                      <F label="Título línea 3" fieldKey="heroTitle3" value={data.heroTitle3 || ''} onChange={handleField} placeholder="en tu fiesta" />
                      <F label="Descripción" fieldKey="heroDesc" value={data.heroDesc || ''} onChange={handleField} type="textarea" rows={2} placeholder="Más de una década transformando celebraciones…" />
                    </div>
                  </fieldset>

                  {/* Stats */}
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Estadísticas (4 cards)</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[1, 2, 3].map(n => (
                        <StatCard key={n} index={n}
                          num={data[`sn${n}num`] || ''}
                          label={data[`sn${n}label`] || ''}
                          secondary={data[`sn${n}icon`] || ''}
                          onEdit={() => openStatsEdit('nosotros', n)} />
                      ))}
                      {/* Stat #4: Servicios — auto-calculado igual que en sección Estadísticas */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, background: '#eff6ff', borderRadius: 10,
                        padding: '0.75rem 1rem', border: '1px solid #bfdbfe'
                      }}>
                        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f5c842', fontWeight: 800, fontSize: '1rem', flexShrink: 0, textAlign: 'center', padding: '0 4px' }}>
                          {servicesCount ?? data.sn4num ?? '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0a1628', margin: '0 0 2px' }}>
                            {data.sn4label || 'Servicios únicos'}
                          </p>
                          <p style={{ fontSize: '0.72rem', color: '#3b82f6', margin: 0 }}>
                            🔄 Se actualiza automáticamente según los servicios activos
                          </p>
                        </div>
                        <span style={{
                          fontSize: '0.65rem', background: '#dbeafe', color: '#1d4ed8',
                          borderRadius: 6, padding: '3px 8px', fontWeight: 700
                        }}>
                          AUTO
                        </span>
                      </div>
                    </div>
                  </fieldset>

                  {/* Historia */}
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Historia / Timeline</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="cfg-2col" style={{ gap: 12 }}>
                        <F label="Subtítulo sección" fieldKey="histSubtitle" value={data.histSubtitle || ''} onChange={handleField} placeholder="Nuestra trayectoria" />
                        <F label="H2 (parte dorada)" fieldKey="histH2Gold" value={data.histH2Gold || ''} onChange={handleField} placeholder="construyendo magia" />
                      </div>
                      <F label="Descripción" fieldKey="histDesc" value={data.histDesc || ''} onChange={handleField} type="textarea" rows={2} placeholder="Desde nuestros inicios en 2014..." />
                      <ListHeader lb="Hitos" count={(data.hitos || []).length} listKey="hitos" def={{ year: '', label: '', desc: '' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(data.hitos || []).map((h: any, i: number) => (
                          <ItemCard key={i} item={h}
                            onEdit={() => openEdit('hitos', i)}
                            onToggle={() => toggleVisible('hitos', i)}
                            onDelete={() => deleteItem('hitos', i)} />
                        ))}
                      </div>
                    </div>
                  </fieldset>

                  {/* Valores */}
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Valores</legend>
                    <ListHeader lb="Cards de valores" count={(data.valores || []).length} listKey="valores" def={{ icon: '✨', title: '', desc: '', gradient: '#f59e0b,#d97706' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(data.valores || []).map((v: any, i: number) => (
                        <ItemCard key={i} item={v}
                          onEdit={() => openEdit('valores', i)}
                          onToggle={() => toggleVisible('valores', i)}
                          onDelete={() => deleteItem('valores', i)} />
                      ))}
                    </div>
                  </fieldset>

                  {/* Misión */}
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Misión</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <F label="Subtítulo" fieldKey="misionSubtitle" value={data.misionSubtitle || ''} onChange={handleField} placeholder="Por qué existimos" />
                      <F label="H2" fieldKey="misionH2" value={data.misionH2 || ''} onChange={handleField} placeholder="Creamos recuerdos que duran toda la vida" />
                      <F label="Párrafo 1" fieldKey="misionP1" value={data.misionP1 || ''} onChange={handleField} type="textarea" rows={3} placeholder="Nuestra misión es..." />
                      <F label="Párrafo 2" fieldKey="misionP2" value={data.misionP2 || ''} onChange={handleField} type="textarea" rows={3} placeholder="Creemos que cada celebración..." />
                      <ListHeader lb="Feature cards" count={(data.misionCards || []).length} listKey="misionCards" def={{ icon: '🎭', title: '', desc: '' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(data.misionCards || []).map((c: any, i: number) => (
                          <ItemCard key={i} item={c}
                            onEdit={() => openEdit('misionCards', i)}
                            onToggle={() => toggleVisible('misionCards', i)}
                            onDelete={() => deleteItem('misionCards', i)} />
                        ))}
                      </div>
                    </div>
                  </fieldset>

                  {/* CTA */}
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>CTA Final</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <F label="Badge" fieldKey="ctaBadge" value={data.ctaBadge || ''} onChange={handleField} placeholder="¿Lista tu celebración?" />
                      <F label="Título H2" fieldKey="ctaH2" value={data.ctaH2 || ''} onChange={handleField} placeholder="Tu evento soñado comienza aquí" />
                      <F label="Descripción" fieldKey="ctaDesc" value={data.ctaDesc || ''} onChange={handleField} type="textarea" rows={2} placeholder="Contáctanos y hagamos realidad tu evento soñado..." />
                      <div className="cfg-2col" style={{ gap: 12 }}>
                        <F label="Texto botón 1" fieldKey="ctaBtn1" value={data.ctaBtn1 || ''} onChange={handleField} placeholder="✨ Empezar a planear" />
                        <F label="URL botón 1" fieldKey="ctaBtn1Url" value={data.ctaBtn1Url || ''} onChange={handleField} placeholder="/contacto" />
                        <F label="Texto botón 2" fieldKey="ctaBtn2" value={data.ctaBtn2 || ''} onChange={handleField} placeholder="💬 Hablar por WhatsApp" />
                        <F label="URL botón 2" fieldKey="ctaBtn2Url" value={data.ctaBtn2Url || ''} onChange={handleField} placeholder="https://wa.me/51945203708" />
                      </div>
                    </div>
                  </fieldset>
                </div>
              )}

              {/* ══════════ WHY US ══════════ */}
              {section === 'why-us' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {isDefaults && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💡</span>
                      <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0 }}>
                        Estos son <strong>datos de ejemplo</strong> — aún no has guardado esta sección. Edítalos a tu gusto y haz clic en <strong>Guardar sección</strong>.
                      </p>
                    </div>
                  )}
                  <F label='Título H2 (usa <em>texto</em> para dorado)' fieldKey="h2" value={data.h2 || ''} onChange={handleField} placeholder='¿Por qué <em>elegirnos</em>?' />
                  <F label="Descripción" fieldKey="desc" value={data.desc || ''} onChange={handleField} placeholder="Más de una década transformando celebraciones en Sechura." />

                  {/* Restore defaults button */}
                  {(data.items || []).length < 6 && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0 }}>
                        💡 Se detectaron {(data.items || []).length} de 6 elementos. ¿Restaurar los 6 originales?
                      </p>
                      <button
                        onClick={() => open({
                          type: 'confirm', title: 'Restaurar 6 puntos originales',
                          description: 'Se reemplazarán los elementos actuales por los 6 puntos por defecto. Después podrás editarlos.',
                          onConfirm: async () => { set('items', DEFAULT_WHY_ITEMS); },
                        })}
                        className="btn-outline" style={{ fontSize: '0.78rem', padding: '0.35rem 0.875rem', whiteSpace: 'nowrap' }}>
                        🔄 Restaurar defaults
                      </button>
                    </div>
                  )}

                  <div>
                    <ListHeader lb="Puntos / Cards" count={(data.items || []).length} listKey="items" def={{ icon: '✨', title: '', desc: '' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(data.items || []).map((item: any, i: number) => (
                        <ItemCard key={i} item={item}
                          onEdit={() => openEdit('items', i)}
                          onToggle={() => toggleVisible('items', i)}
                          onDelete={() => deleteItem('items', i)} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ BRANDS ══════════ */}
              {section === 'brands' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {isDefaults && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💡</span>
                      <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0 }}>
                        Estos son <strong>datos de ejemplo</strong> — aún no has guardado esta sección. Edítalos a tu gusto y haz clic en <strong>Guardar sección</strong>.
                      </p>
                    </div>
                  )}
                  <F label="Título de la sección" fieldKey="h2" value={data.h2 || ''} onChange={handleField} placeholder="Empresas que confían en nosotros" />
                  <ListHeader lb="Empresas / Marcas" count={(data.brands || []).length} listKey="brands" def={{ name: '', logo: '🏢', logoUrl: '', visible: true }} />
                  {(data.brands || []).length === 0 && (
                    <p style={{ color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: 10, border: '1px dashed #e2e8f0' }}>
                      No hay marcas. Haz clic en "+ Agregar" para añadir una empresa.
                    </p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(data.brands || []).map((b: any, i: number) => (
                      <ItemCard key={i} item={b}
                        onEdit={() => openEdit('brands', i)}
                        onToggle={() => toggleVisible('brands', i)}
                        onDelete={() => deleteItem('brands', i)} />
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════ CONTACTO ══════════ */}
              {section === 'contacto' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '0.75rem 1rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: 0 }}>📞 Esta información aparece en la sección de contacto de la web y en el footer.</p>
                  </div>
                  <div className="cfg-2col" style={{ gap: 16 }}>
                    <F label="Teléfono (mostrar)" fieldKey="telefono" value={data.telefono || ''} onChange={handleField} placeholder="+51 945 203 708" />
                    <F label="WhatsApp (solo números)" fieldKey="whatsapp" value={data.whatsapp || ''} onChange={handleField} placeholder="51945203708" />
                    <F label="Correo electrónico" fieldKey="email" value={data.email || ''} onChange={handleField} type="email" placeholder="jm@gmail.com" />
                    <F label="Dirección" fieldKey="direccion" value={data.direccion || ''} onChange={handleField} placeholder="Sechura, Piura, Perú" />
                    <F label="Horario de atención" fieldKey="horario" value={data.horario || ''} onChange={handleField} placeholder="Lunes a Domingo — 9am a 8pm" />
                  </div>
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Redes Sociales</legend>
                    <div className="cfg-2col" style={{ gap: 16 }}>
                      <F label="Instagram URL" fieldKey="instagram" value={data.instagram || ''} onChange={handleField} placeholder="https://instagram.com/jymeventos" />
                      <F label="Facebook URL" fieldKey="facebook" value={data.facebook || ''} onChange={handleField} placeholder="https://facebook.com/jymeventos" />
                      <F label="TikTok URL" fieldKey="tiktok" value={data.tiktok || ''} onChange={handleField} placeholder="https://tiktok.com/@jymeventos" />
                      <F label="YouTube URL (opcional)" fieldKey="youtube" value={data.youtube || ''} onChange={handleField} placeholder="https://youtube.com/@jymeventos" />
                    </div>
                  </fieldset>
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Ubicación en Google Maps</legend>
                    <div className="cfg-2col" style={{ gap: 16 }}>
                      <F label="Latitud" fieldKey="mapsLat" value={data.mapsLat || ''} onChange={handleField} placeholder="-5.5566" />
                      <F label="Longitud" fieldKey="mapsLng" value={data.mapsLng || ''} onChange={handleField} placeholder="-80.8234" />
                    </div>
                  </fieldset>
                </div>
              )}

              {/* ══════════ NAVBAR ══════════ */}
              {section === 'navbar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <F label="Nombre en el navbar" fieldKey="nombre" value={data.nombre || ''} onChange={handleField} placeholder="J&M Decoraciones y Eventos" />
                  <F label="Tagline" fieldKey="tagline" value={data.tagline || ''} onChange={handleField} placeholder="Decoraciones y Eventos" />
                  <ImageUploader label="Logo (se muestra en navbar y footer — máx 200MB)" folder="logos"
                    value={data.logo} focal={{ x: 0.5, y: 0.5 }} acceptVideo={false}
                    previewAspect={3 / 1} previewLabel="Navbar / Footer (franja horizontal)"
                    onComplete={(url) => set('logo', url)} />
                  {data.logo && (
                    <div style={{ background: '#0a1628', borderRadius: 12, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={data.logo} alt="Logo preview" style={{ height: 48, objectFit: 'contain' }} />
                      <div>
                        <p style={{ color: '#fff', fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: '1rem', margin: 0 }}>{data.nombre || 'J&M Decoraciones y Eventos'}</p>
                        <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '0.7rem', margin: 0 }}>{data.tagline || 'Decoraciones y Eventos'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════ FOOTER ══════════ */}
              {section === 'footer' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '0.75rem 1rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: 0 }}>
                      🦶 El footer muestra logo, servicios y contacto automáticamente desde las secciones Navbar y Contacto. Aquí configuras el texto estático del footer.
                    </p>
                  </div>
                  <F label="Descripción de la empresa (columna izquierda)" fieldKey="desc" type="textarea" rows={3}
                    value={data.desc || ''} onChange={handleField}
                    placeholder="En cada evento, cuidamos cada detalle para que tú solo te encargues de disfrutar..." />
                  <div className="cfg-2col" style={{ gap: 16 }}>
                    <F label="Localidad (ej: Sechura)" fieldKey="tagline" value={data.tagline || ''} onChange={handleField} placeholder="Sechura" />
                    <F label="Año de fundación" fieldKey="foundedYear" value={data.foundedYear || ''} onChange={handleField} placeholder="2018" />
                  </div>
                  <F label="Nombre legal completo en footer" fieldKey="legalName" value={data.legalName || ''} onChange={handleField} placeholder="J&M Decoraciones y Eventos" />
                  <F label="Cita / Frase en cursiva" fieldKey="quote" value={data.quote || ''} onChange={handleField} placeholder="J&M Decoraciones y Eventos" />
                  <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1rem 1.25rem', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 8px', fontWeight: 600 }}>Vista previa del copyright:</p>
                    <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                      © {data.foundedYear || '2018'} – {new Date().getFullYear()} {data.legalName || 'J&M Decoraciones y Eventos'} | Todos los derechos reservados.
                    </p>
                  </div>
                </div>
              )}

              {/* ══════════ WHATSAPP WIDGET ══════════ */}
              {section === 'whatsapp' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '0.75rem 1rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#166534', margin: 0 }}>
                      💬 Configura el widget de WhatsApp que aparece en todas las páginas de la web. Los cambios se reflejan al redesplegar.
                    </p>
                  </div>

                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Marca</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="cfg-2col" style={{ gap: 16 }}>
                        <F label="Número WhatsApp (con código país)" fieldKey="phoneNumber" value={data.phoneNumber || ''} onChange={handleField} placeholder="51945203708" />
                        <div>
                          {lbl('Color primario de la marca')}
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <label style={{ position: 'relative', cursor: 'pointer' }}>
                              <div style={{ width: 38, height: 38, borderRadius: 10, background: data.primaryColor || '#085E54', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                              <input type="color" value={data.primaryColor || '#085E54'} onChange={e => handleField('primaryColor', e.target.value)}
                                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                            </label>
                            <input type="text" value={data.primaryColor || ''} onChange={e => handleField('primaryColor', e.target.value)}
                              className="admin-input" style={{ width: 100, fontFamily: 'monospace', fontSize: '0.82rem' }} placeholder="#085E54" />
                          </div>
                        </div>
                      </div>
                      <ImageUploader label="Logo del widget (URL de Cloudinary)" folder="logos" acceptVideo={false}
                        value={data.logoUrl} previewAspect={1} previewLabel="Logo cuadrado"
                        onComplete={(url) => set('logoUrl', url)} />
                    </div>
                  </fieldset>

                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Botón flotante</legend>
                    <div className="cfg-2col" style={{ gap: 16 }}>
                      <div>
                        {lbl('Color del botón')}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <label style={{ position: 'relative', cursor: 'pointer' }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: data.buttonColor || '#1c9247', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                            <input type="color" value={data.buttonColor || '#1c9247'} onChange={e => handleField('buttonColor', e.target.value)}
                              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                          </label>
                          <input type="text" value={data.buttonColor || ''} onChange={e => handleField('buttonColor', e.target.value)}
                            className="admin-input" style={{ width: 100, fontFamily: 'monospace', fontSize: '0.82rem' }} placeholder="#1c9247" />
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Notificación emergente</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
                        <F label="Texto del aviso emergente" fieldKey="promptText" value={data.promptText || ''} onChange={handleField} placeholder="👋 Hola, resuelve la duda que tengas" />
                        <div>
                          {lbl('Delay (seg)')}
                          <input type="number" value={data.promptDelay ?? 5} onChange={e => set('promptDelay', Number(e.target.value))}
                            className="admin-input" placeholder="5" />
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Ventana del chat</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <F label="Título del popup" fieldKey="popupTitle" value={data.popupTitle || ''} onChange={handleField} placeholder="J&M Decoraciones y Eventos" />
                      <F label="Subtítulo (tiempo de respuesta)" fieldKey="popupSubtitle" value={data.popupSubtitle || ''} onChange={handleField} placeholder="Usualmente responde en 1 hora" />
                      <F label="Mensaje de bienvenida" fieldKey="welcomeText" value={data.welcomeText || ''} onChange={handleField} placeholder="👋 Hola, ¿en qué podemos ayudarte?" />
                      <F label="Texto predeterminado del cliente" fieldKey="customerText" value={data.customerText || ''} onChange={handleField} placeholder="Hola, quiero cotizar un evento" />
                    </div>
                  </fieldset>
                </div>
              )}

              {/* ══════════ SEO / METADATOS ══════════ */}
              {section === 'seo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '0.75rem 1rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: 0 }}>
                      🔍 Título y descripción que Google muestra en los resultados de búsqueda para cada página.
                      Los cambios se reflejan al redesplegar la web. Recomendado: título hasta 60 caracteres, descripción hasta 155.
                    </p>
                  </div>

                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Inicio</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <F label="Título (SEO)" fieldKey="homeTitle" value={data.homeTitle || ''} onChange={handleField} placeholder="Shows, Decoración y Catering en Sechura, Piura" />
                      <F label="Descripción (SEO)" fieldKey="homeDesc" type="textarea" rows={2} value={data.homeDesc || ''} onChange={handleField} placeholder="Organizamos shows infantiles, hora loca..." />
                    </div>
                  </fieldset>

                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Contacto</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <F label="Título (SEO)" fieldKey="contactoTitle" value={data.contactoTitle || ''} onChange={handleField} placeholder="Contacto y Cotizaciones" />
                      <F label="Descripción (SEO)" fieldKey="contactoDesc" type="textarea" rows={2} value={data.contactoDesc || ''} onChange={handleField} placeholder="Cotiza tu evento en Sechura, Piura..." />
                    </div>
                  </fieldset>

                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Galería</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <F label="Título (SEO)" fieldKey="galeriaTitle" value={data.galeriaTitle || ''} onChange={handleField} placeholder="Galería de Eventos" />
                      <F label="Descripción (SEO)" fieldKey="galeriaDesc" type="textarea" rows={2} value={data.galeriaDesc || ''} onChange={handleField} placeholder="Fotos y videos reales de shows infantiles..." />
                    </div>
                  </fieldset>

                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Sobre Nosotros</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <F label="Título (SEO)" fieldKey="nosotrosTitle" value={data.nosotrosTitle || ''} onChange={handleField} placeholder="Nuestra Historia" />
                      <F label="Descripción (SEO)" fieldKey="nosotrosDesc" type="textarea" rows={2} value={data.nosotrosDesc || ''} onChange={handleField} placeholder="Más de 10 años creando experiencias..." />
                    </div>
                  </fieldset>

                  <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '0.75rem 1rem' }}>
                    <p style={{ fontSize: '0.78rem', color: '#854d0e', margin: 0 }}>
                      ℹ️ Las 9 páginas de Servicios individuales (Shows Infantiles, Quinceaños, etc.) generan su título y descripción
                      automáticamente a partir de su propio contenido — no se editan aquí.
                    </p>
                  </div>
                </div>
              )}

              {/* ══════════ ANUNCIA CON NOSOTROS ══════════ */}
              {section === 'anuncia' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                  {/* Hero */}
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Hero</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <F label="Badge (texto etiqueta dorada)" fieldKey="heroBadge" value={data.heroBadge || ''} onChange={handleField} placeholder="Publicidad &amp; Patrocinios" />
                      <div className="cfg-2col" style={{ gap: 12 }}>
                        <F label="Título línea 1" fieldKey="heroTitle1" value={data.heroTitle1 || ''} onChange={handleField} placeholder="Llega a miles de familias" />
                        <F label="Título dorado (línea 2)" fieldKey="heroTitleGold" value={data.heroTitleGold || ''} onChange={handleField} placeholder="que celebran" />
                      </div>
                      <F label="Descripción" fieldKey="heroDesc" value={data.heroDesc || ''} onChange={handleField} type="textarea" rows={2} placeholder="Conecta tu marca con una audiencia local comprometida..." />
                      <F label="Texto del botón CTA" fieldKey="heroCta" value={data.heroCta || ''} onChange={handleField} placeholder="Ver planes de publicidad ↓" />
                    </div>
                  </fieldset>

                  {/* Stats */}
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Estadísticas de audiencia</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <F label="Título sección" fieldKey="statsTitle" value={data.statsTitle || ''} onChange={handleField} placeholder="Nuestra audiencia en números" />
                      <ListHeader lb="Estadísticas" count={(data.anunciaStats || []).length} listKey="anunciaStats" def={{ icon: '👁️', value: 10000, suffix: '+', label: 'Visitas por mes' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(data.anunciaStats || []).map((s: any, i: number) => (
                          <ItemCard key={i} item={{ ...s, title: `${s.value}${s.suffix}`, desc: s.label }}
                            onEdit={() => openEdit('anunciaStats', i)}
                            onToggle={() => toggleVisible('anunciaStats', i)}
                            onDelete={() => deleteItem('anunciaStats', i)} />
                        ))}
                      </div>
                    </div>
                  </fieldset>

                  {/* Benefits */}
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Por qué anunciar aquí</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className="cfg-2col" style={{ gap: 12 }}>
                        <F label="Badge texto" fieldKey="benefitsBadge" value={data.benefitsBadge || ''} onChange={handleField} placeholder="Por qué anunciar aquí" />
                        <F label="Título sección" fieldKey="benefitsTitle" value={data.benefitsTitle || ''} onChange={handleField} placeholder="Tu marca, en el momento exacto" />
                      </div>
                      <ListHeader lb="Beneficios" count={(data.anunciaBenefits || []).length} listKey="anunciaBenefits" def={{ icon: '🎯', title: '', desc: '' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(data.anunciaBenefits || []).map((b: any, i: number) => (
                          <ItemCard key={i} item={b}
                            onEdit={() => openEdit('anunciaBenefits', i)}
                            onToggle={() => toggleVisible('anunciaBenefits', i)}
                            onDelete={() => deleteItem('anunciaBenefits', i)} />
                        ))}
                      </div>
                    </div>
                  </fieldset>

                  {/* Plans/Tiers */}
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>Planes de publicidad</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <F label="Título sección planes" fieldKey="tiersTitle" value={data.tiersTitle || ''} onChange={handleField} placeholder="Planes de publicidad" />
                      <ListHeader lb="Planes" count={(data.anunciaTiers || []).length} listKey="anunciaTiers" def={{ name: 'Nuevo Plan', price: 'S/. 200', period: '/mes', icon: '🏷️', cta: 'Contratar', features: [], popular: false }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(data.anunciaTiers || []).map((t: any, i: number) => (
                          <ItemCard key={i} item={{ ...t, title: t.name, desc: `${t.price}${t.period} · ${(t.features || []).length} características${t.popular ? ' · ⭐ Popular' : ''}` }}
                            onEdit={() => openEdit('anunciaTiers', i)}
                            onToggle={() => toggleVisible('anunciaTiers', i)}
                            onDelete={() => deleteItem('anunciaTiers', i)} />
                        ))}
                      </div>
                    </div>
                  </fieldset>

                  {/* CTA final */}
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <legend style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1e3a5f', padding: '0 6px' }}>CTA Final</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <F label="Título" fieldKey="ctaTitle" value={data.ctaTitle || ''} onChange={handleField} placeholder="¿Listo para crecer con J&M?" />
                      <F label="Descripción" fieldKey="ctaDesc" value={data.ctaDesc || ''} onChange={handleField} type="textarea" rows={2} placeholder="Contáctanos y diseñemos juntos el plan perfecto..." />
                      <div className="cfg-2col" style={{ gap: 12 }}>
                        <F label="Botón 1 texto" fieldKey="ctaBtn1" value={data.ctaBtn1 || ''} onChange={handleField} placeholder="✉️ Enviar propuesta" />
                        <F label="Botón 1 URL" fieldKey="ctaBtn1Url" value={data.ctaBtn1Url || ''} onChange={handleField} placeholder="/contacto" />
                        <F label="Botón 2 texto" fieldKey="ctaBtn2" value={data.ctaBtn2 || ''} onChange={handleField} placeholder="💬 WhatsApp" />
                        <F label="Botón 2 URL" fieldKey="ctaBtn2Url" value={data.ctaBtn2Url || ''} onChange={handleField} placeholder="https://wa.me/51945203708" />
                      </div>
                    </div>
                  </fieldset>
                </div>
              )}

              {/* ══════════ LEGAL ══════════ */}
              {section === 'legal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.75rem 1rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#92400e', margin: 0 }}>
                      ⚖️ Edita el contenido de las páginas legales (Privacidad, Términos y Cookies). Los cambios son inmediatos en la web.
                    </p>
                  </div>

                  {/* Sub-tabs */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['privacidad', 'terminos', 'cookies'] as const).map(tab => (
                      <button key={tab} onClick={() => setLegalTab(tab)}
                        style={{
                          padding: '0.55rem 1rem', borderRadius: 9, border: legalTab === tab ? '1px solid rgba(30,58,95,.3)' : '1px solid #e2e8f0',
                          cursor: 'pointer', fontFamily: 'var(--font-jakarta)', fontSize: '0.82rem',
                          fontWeight: legalTab === tab ? 700 : 400,
                          background: legalTab === tab ? '#1e3a5f' : '#f8fafc',
                          color: legalTab === tab ? '#fff' : '#64748b', whiteSpace: 'nowrap',
                        }}>
                        {tab === 'privacidad' ? '🔒 Privacidad' : tab === 'terminos' ? '📋 Términos' : '🍪 Cookies'}
                      </button>
                    ))}
                  </div>

                  {/* Sections list */}
                  <div>
                    <ListHeader lb={`Secciones — ${legalTab}`}
                      count={(data[legalTab] || []).length}
                      listKey="legalSections"
                      def={{ title: 'Nueva sección', content: '' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(data[legalTab] || []).map((s: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', borderRadius: 10, padding: '0.75rem 1rem', border: '1px solid #e2e8f0' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0a1628', margin: '0 0 2px' }}>{s.title}</p>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.content?.slice(0, 80)}…</p>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => setEditModal({ listKey: 'legalSections', index: i, form: { ...s } })}
                              style={{ background: 'none', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center' }}>
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => {
                              const items = [...(data[legalTab] || [])];
                              items.splice(i, 1);
                              set(legalTab, items);
                            }}
                              style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 8, padding: '6px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ TESTIMONIOS ══════════ */}
              {section === 'testimonios' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>{testimonios.filter(t => t.visible).length} visibles de {testimonios.length}</p>
                    <button onClick={() => setTestModal({ id: null, form: { stars: 5 } })} className="btn-primary">
                      <Plus size={16} /> Nuevo testimonio
                    </button>
                  </div>

                  {testLoading
                    ? [...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)
                    : testimonios.length === 0
                      ? (
                        <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: 12, border: '1px dashed #e2e8f0' }}>
                          <p style={{ fontSize: '2rem', marginBottom: 8 }}>⭐</p>
                          <p style={{ color: '#64748b' }}>No hay testimonios aún. Haz clic en "Nuevo testimonio".</p>
                        </div>
                      ) : testimonios.map(item => (
                        <div key={item.id} className="admin-card"
                          style={{ padding: '1rem 1.25rem', display: 'flex', gap: 12, alignItems: 'flex-start', opacity: item.visible ? 1 : 0.65 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                            {item.avatar
                              ? <img src={item.avatar} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${(item.focalX ?? 0.5) * 100}% ${(item.focalY ?? 0.5) * 100}%` }} />
                              : (item.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0a1628', margin: 0 }}>{item.name}</p>
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.role}</span>
                              <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>{'★'.repeat(item.stars || 5)}</span>
                              {!item.visible && <span style={{ fontSize: '0.65rem', background: '#f1f5f9', color: '#94a3b8', borderRadius: 4, padding: '1px 5px' }}>Oculto</span>}
                            </div>
                            <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>"{item.text}"</p>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => setTestModal({ id: item.id, form: { name: item.name, role: item.role, text: item.text, stars: item.stars || 5, avatar: item.avatar || '', focalX: item.focalX ?? 0.5, focalY: item.focalY ?? 0.5 } })}
                              style={{ background: 'none', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center' }}><Edit2 size={14} /></button>
                            <button onClick={() => toggleTestVisible(item)}
                              style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>{item.visible ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                            <button onClick={() => deleteTestimonio(item)}
                              style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 8, padding: '6px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))
                  }
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          MODAL — generic list items
      ════════════════════════════════════════════════ */}
      <EditModal
        open={!!editModal}
        title={
          editModal?.index === null ? 'Agregar elemento'
            : editModal?.listKey === 'items' ? 'Editar tarjeta'
              : editModal?.listKey === 'hitos' ? 'Editar hito'
                : editModal?.listKey === 'valores' ? 'Editar valor'
                  : editModal?.listKey === 'misionCards' ? 'Editar card de misión'
                    : editModal?.listKey === 'brands' ? 'Editar marca'
                      : editModal?.listKey === 'anunciaStats' ? 'Editar estadística'
                        : editModal?.listKey === 'anunciaBenefits' ? 'Editar beneficio'
                          : editModal?.listKey === 'anunciaTiers' ? 'Editar plan'
                            : editModal?.listKey === 'legalSections' ? 'Editar sección legal'
                              : 'Editar'
        }
        onSave={saveFromModal}
        onCancel={() => setEditModal(null)}
      >
        {renderModalFields()}
      </EditModal>

      {/* ════════════════════════════════════════════════
          MODAL — stats
      ════════════════════════════════════════════════ */}
      <EditModal
        open={!!statsModal}
        title={statsModal ? `Editar estadística #${statsModal.n}` : ''}
        onSave={saveStatsModal}
        onCancel={() => setStatsModal(null)}
      >
        {statsModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              {lbl('Número / Valor (ej: +500, 10+)')}
              <input type="text" value={statsModal.form.num || ''} onChange={e => setSMF('num', e.target.value)}
                placeholder={statsModal.type === 'main' ? '+500' : '+100'} className="admin-input" />
            </div>
            <div>
              {lbl('Etiqueta')}
              <input type="text" value={statsModal.form.label || ''} onChange={e => setSMF('label', e.target.value)}
                placeholder={statsModal.type === 'main' ? 'Fiestas exitosas' : 'Eventos realizados'} className="admin-input" />
            </div>
            {statsModal.type === 'main' && (
              <div>
                {lbl('Subtexto descriptivo')}
                <input type="text" value={statsModal.form.sub || ''} onChange={e => setSMF('sub', e.target.value)}
                  placeholder="Celebraciones realizadas con éxito" className="admin-input" />
              </div>
            )}
            {statsModal.type === 'nosotros' && (
              <div>
                {lbl('Ícono emoji')}
                <input type="text" value={statsModal.form.icon || ''} onChange={e => setSMF('icon', e.target.value)}
                  className="admin-input" style={{ textAlign: 'center', fontSize: '1.4rem', padding: '0.35rem', width: 70 }} placeholder="🎉" />
              </div>
            )}
          </div>
        )}
      </EditModal>

      {/* ════════════════════════════════════════════════
          MODAL — testimonio (add / edit)
      ════════════════════════════════════════════════ */}
      <EditModal
        open={!!testModal}
        title={testModal?.id ? 'Editar testimonio' : 'Nuevo testimonio'}
        onSave={saveTestimonio}
        onCancel={() => setTestModal(null)}
      >
        {testModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="cfg-2col" style={{ gap: 12 }}>
              <div>
                {lbl('Nombre *')}
                <input type="text" value={testModal.form.name || ''} onChange={e => setTestModal(p => p ? { ...p, form: { ...p.form, name: e.target.value } } : null)}
                  placeholder="Ej: María García" className="admin-input" />
              </div>
              <div>
                {lbl('Rol / Evento')}
                <input type="text" value={testModal.form.role || ''} onChange={e => setTestModal(p => p ? { ...p, form: { ...p.form, role: e.target.value } } : null)}
                  placeholder="Ej: Mamá de Valentina" className="admin-input" />
              </div>
            </div>
            <div>
              {lbl('Testimonio *')}
              <textarea rows={4} value={testModal.form.text || ''} onChange={e => setTestModal(p => p ? { ...p, form: { ...p.form, text: e.target.value } } : null)}
                placeholder="Escribe el texto del testimonio…" className="admin-input" style={{ resize: 'vertical' }} />
            </div>
            <div>
              {lbl('Estrellas')}
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button"
                    onClick={() => setTestModal(p => p ? { ...p, form: { ...p.form, stars: n } } : null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', padding: 0, color: (testModal.form.stars || 5) >= n ? '#f59e0b' : '#e2e8f0' }}>★</button>
                ))}
              </div>
            </div>
            {/* Always allow changing avatar (add & edit) */}
            <ImageUploader
              label={testModal.id ? 'Cambiar foto del cliente (opcional)' : 'Foto del cliente (opcional)'}
              folder="testimonios" acceptVideo={false}
              value={testModal.form.avatar || undefined}
              previewAspect={1} previewLabel="Avatar circular en testimonio"
              onComplete={(url, fp) => setTestModal(p => p ? { ...p, form: { ...p.form, avatar: url, focalX: fp.x, focalY: fp.y } } : null)} />
          </div>
        )}
      </EditModal>

    </div>
  );
}
