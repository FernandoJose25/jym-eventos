// Valores por defecto de la configuración del sitio (site_config).
// Extraídos de configuracion/page.tsx para adelgazar ese archivo: son datos
// puros (sin JSX ni hooks), se usan cuando Firestore aún no tiene el
// documento de la sección. Los de la home deben coincidir con lo que la web
// muestra por defecto en apps/web/src/components/sections/*.

/* ─────────────────────────────────────────────────────
   DEFAULT ITEMS
───────────────────────────────────────────────────── */
export const DEFAULT_BRANDS = [
  { name: 'Telecable Smart', logo: '📡', logoUrl: '', visible: true },
  { name: 'Komatsu', logo: '⚙️', logoUrl: '', visible: true },
  { name: 'Misky Mayo', logo: '🌿', logoUrl: '', visible: true },
  { name: 'Salón El Paraíso', logo: '🏛️', logoUrl: '', visible: true },
  { name: 'Luminex', logo: '💡', logoUrl: '', visible: true },
  { name: 'Quavii', logo: '🎯', logoUrl: '', visible: true },
];

export const DEFAULT_WHY_ITEMS = [
  { icon: '🏆', title: 'Experiencia Comprobada', desc: 'Más de 10 años organizando eventos exitosos en Sechura y toda la región Piura.', visible: true },
  { icon: '🎨', title: 'Diseño Personalizado', desc: 'Cada evento es único. Adaptamos cada detalle a tu visión y presupuesto.', visible: true },
  { icon: '⏰', title: 'Puntualidad Garantizada', desc: 'Llegamos antes que tus invitados. La puntualidad es nuestro compromiso.', visible: true },
  { icon: '💎', title: 'Materiales Premium', desc: 'Usamos solo materiales y equipos de primera calidad para resultados excepcionales.', visible: true },
  { icon: '📸', title: 'Momentos Memorables', desc: 'Creamos experiencias que quedarán en la memoria de todos tus invitados.', visible: true },
  { icon: '🤝', title: 'Atención Personalizada', desc: 'Equipo dedicado disponible antes, durante y después de tu evento.', visible: true },
];

// Preguntas frecuentes de la home. Deben coincidir con DEFAULT_ITEMS de
// apps/web/src/components/sections/FaqSection.tsx (campos q/a) para que el
// editor arranque con el mismo contenido que hoy muestra la web por defecto.
export const DEFAULT_FAQ_ITEMS = [
  { q: '¿Con cuánta anticipación debo reservar?', a: 'Lo ideal es reservar con al menos 3 semanas de anticipación. Para fechas de temporada alta (diciembre, día de la madre, fiestas patrias), bodas y quinceaños te recomendamos escribirnos con 1 a 2 meses: esas fechas se llenan rápido.', visible: true },
  { q: '¿La cotización tiene algún costo?', a: 'No, es totalmente gratis y sin compromiso. Cuéntanos por WhatsApp qué evento tienes en mente y te preparamos una propuesta personalizada según lo que necesitas y tu presupuesto.', visible: true },
  { q: '¿Piden adelanto para asegurar la fecha?', a: 'Sí. Con el 50% de adelanto separamos tu fecha en exclusiva y el saldo se cancela el día del evento. Así garantizamos que ese día nuestro equipo esté reservado solo para ti.', visible: true },
  { q: '¿Atienden fuera de Sechura?', a: 'Sí, atendemos Sechura, Piura y alrededores. Escríbenos por WhatsApp con tu distrito y te confirmamos la cobertura de inmediato.', visible: true },
  { q: '¿Puedo combinar varios servicios?', a: 'Claro, es lo más común: show + decoración + catering + fotografía en un solo evento con un solo equipo coordinando todo. Cuéntanos tu idea y armamos la combinación perfecta para tu celebración.', visible: true },
  { q: '¿Qué necesitan saber para cotizar?', a: 'Solo tres cosas: tipo de evento, fecha tentativa y cantidad aproximada de invitados. Con eso te respondemos en menos de 2 horas en horario de atención.', visible: true },
];

export const DEFAULT_SEO = {
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
export const DEFAULT_HERO = {
  eyebrow: 'J&M Decoraciones y Eventos',
  h1: 'Hacemos que cada celebración sea <em style="color:#f5c842;font-style:italic;">Mágica</em>',
  desc: 'Organizamos y diseñamos eventos personalizados para bodas, quinceaños, cumpleaños y fiestas temáticas.',
  btn1Text: 'Cotizar Ahora',
  btn1Link: '/contacto',
  btn2Text: 'Ver Servicios',
  btn2Link: '/#servicios',
};

export const DEFAULT_STATS = {
  s1num: '+500', s1label: 'Fiestas exitosas', s1sub: 'Celebraciones realizadas',
  s2num: '10+', s2label: 'Años de experiencia', s2sub: 'Creando sonrisas',
  s3num: '100%', s3label: 'Diversión garantizada', s3sub: 'En cada evento',
  s4label: 'Servicios disponibles',
};

export const DEFAULT_ABOUT = {
  label: 'Quiénes Somos',
  h2: 'Tu Evento en Manos de Expertos Creativos',
  p1: 'Somos una empresa apasionada por crear experiencias únicas e inolvidables.',
  p2: 'Creamos ambientes memorables con detalles únicos que sorprenden a tus invitados.',
  p3: '',
  badgeNum: '+10',
  badgeTxt: 'Años de Experiencia',
};

export const DEFAULT_NAVBAR = {
  nombre: 'J&M Decoraciones y Eventos',
  tagline: 'Decoraciones & Eventos',
};

export const DEFAULT_FOOTER = {
  legalName: 'J&M Decoraciones y Eventos',
  tagline: 'Sechura',
  desc: 'En cada evento, cuidamos cada detalle para que tú solo te encargues de disfrutar. Ofrecemos una gama completa de servicios para hacer de tu celebración una experiencia única.',
  quote: 'J&M Decoraciones y Eventos',
  foundedYear: '2018',
};

export const DEFAULT_CONTACTO = {
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

export const DEFAULT_WHATSAPP = {
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

export const DEFAULT_NOSOTROS = {
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

export const DEFAULT_ANUNCIA = {
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

export const DEFAULT_LEGAL = {
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
