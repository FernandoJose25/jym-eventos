'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, getDocs, where, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cxHero, cxCard, cxVideo } from '@/lib/cloudinary';

const SERVICIOS_DATA: Record<string, any> = {
  'shows-infantiles': {
    badge: '🎭 Show Kids', title: 'Shows Infantiles',
    hero: 'Espectáculos llenos de magia, música y diversión con los personajes favoritos de los niños.',
    h2: 'Diversión sin Límites para los Más Pequeños',
    p1: 'Nuestros shows infantiles son espectáculos diseñados para hacer de cada cumpleaños o evento una experiencia mágica e irrepetible. Contamos con animadores profesionales, personajes temáticos, magia, burbujas, pintacaritas y mucho más.',
    p2: 'Adaptamos el show a la edad de los niños y a la temática elegida por los padres, garantizando una hora de diversión explosiva que los niños recordarán siempre.',
    features: [
      { text: 'Personajes temáticos', detail: 'Superhéroes, princesas, animales y más opciones.' },
      { text: 'Show de magia', detail: 'Trucos sorprendentes que dejan a los niños boquiabiertos.' },
      { text: 'Pintacaritas y globoflexia', detail: 'Arte en vivo durante el evento.' },
      { text: 'Juegos y concursos', detail: 'Dinámica interactiva para toda la audiencia.' },
      { text: 'Música personalizada', detail: 'Playlist temática acorde al show.' },
      { text: 'Duración flexible', detail: 'Shows de 1 a 2 horas según el paquete elegido.' },
    ],
    incluye: [
      { icon: '🎭', title: 'Animadores Profesionales', desc: 'Personal capacitado y carismático que mantiene la energía alta durante todo el show.' },
      { icon: '🎵', title: 'Equipo de Sonido', desc: 'Parlantes y micrófono para que la música y el animador se escuchen perfectamente.' },
      { icon: '🎈', title: 'Globoflexia', desc: 'Creaciones con globos para cada niño: espadas, flores, sombreros y más.' },
      { icon: '🎨', title: 'Pintacaritas', desc: 'Arte facial con pinturas hipoalergénicas, seguras para los más pequeños.' },
      { icon: '🏆', title: 'Premios y Sorpresas', desc: 'Pequeños obsequios para los ganadores de juegos y concursos del show.' },
      { icon: '🚗', title: 'Movilización en Sechura', desc: 'Nos trasladamos al local o domicilio de tu evento en Sechura, Piura y alrededores.' },
    ],
    cta: 'Hagamos un Show Increíble para los Niños',
    ctaDesc: 'Contáctanos hoy y preparamos una propuesta personalizada sin compromiso.',
    img: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&auto=format&fit=crop&q=80',
    relacionados: [
      { title: 'Show Hora Loca', icon: '🎉', href: '/servicios/hora-loca', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop' },
      { title: 'Decoración Temática', icon: '🎨', href: '/servicios/decoracion-tematica', img: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=600&auto=format&fit=crop' },
      { title: 'Catering y Snacks', icon: '🍽️', href: '/servicios/catering-snacks', img: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop' },
    ],
    waText: 'Hola, me interesa un Show Infantil',
    color: '#7c3aed',
  },
  'hora-loca': {
    badge: '🎉 Hora Loca', title: 'Show Hora Loca',
    hero: 'Animación explosiva con juegos, concursos, música y mucha energía para toda la familia.',
    h2: 'Una Hora de Pura Energía y Diversión',
    p1: 'El Show Hora Loca es la animación perfecta para animar cualquier tipo de evento: cumpleaños, bodas, bautizos, fiestas de promoción o reuniones familiares. Nuestros animadores son expertos en romper el hielo y llevar la energía al máximo.',
    p2: 'Con música, luces, accesorios locos y dinámicas grupales, garantizamos que todos los invitados —niños y adultos— participen y se diviertan sin parar.',
    features: [
      { text: 'Animadores energéticos', detail: 'Profesionales con gran carisma y experiencia en animación grupal.' },
      { text: 'Accesorios locos', detail: 'Sombreros, antifaces, lentes y props divertidos para todos.' },
      { text: 'Juegos y retos', detail: 'Dinámicas interactivas pensadas para integrar a todos los asistentes.' },
      { text: 'Música en vivo / DJ', detail: 'Playlist vibrante y adaptada al público del evento.' },
      { text: 'Lluvia de serpentinas', detail: 'El momento más esperado y fotogénico de la fiesta.' },
      { text: 'Premiaciones', detail: 'Reconocimiento especial para los participantes más activos.' },
    ],
    incluye: [
      { icon: '🎤', title: 'Animador Principal', desc: 'Conductor del show con micrófono y experiencia en grandes grupos.' },
      { icon: '🎵', title: 'Equipo de Sonido', desc: 'Parlantes profesionales para que la música se sienta en todo el local.' },
      { icon: '🎊', title: 'Accesorios y Props', desc: 'Set completo de accesorios locos para los invitados durante el show.' },
      { icon: '🌟', title: 'Serpentinas y Confeti', desc: 'El clímax del show con lluvia de color para todos los asistentes.' },
      { icon: '🏆', title: 'Premios para Juegos', desc: 'Detallitos y sorpresas para premiar a los participantes ganadores.' },
      { icon: '🚗', title: 'Movilización en Sechura', desc: 'Llegamos a tu local o domicilio en cualquier distrito de Piura.' },
    ],
    cta: 'Reserva tu Show Hora Loca Hoy',
    ctaDesc: 'Contáctanos y diseñamos la animación perfecta para tu evento.',
    img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
    relacionados: [
      { title: 'Shows Infantiles', icon: '🎭', href: '/servicios/shows-infantiles', img: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop' },
      { title: 'Decoración Temática', icon: '🎨', href: '/servicios/decoracion-tematica', img: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=600&auto=format&fit=crop' },
      { title: 'Filmación y Fotografía', icon: '📸', href: '/servicios/filmacion-fotografia', img: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&auto=format&fit=crop' },
    ],
    waText: 'Hola, me interesa el Show Hora Loca',
    color: '#dc2626',
  },
  'activaciones-empresariales': {
    badge: '🏢 Empresarial', title: 'Activaciones Empresariales',
    hero: 'Eventos corporativos y activaciones de marca con entretenimiento profesional para tu empresa.',
    h2: 'Activaciones que Generan Impacto de Marca',
    p1: 'Diseñamos activaciones empresariales que conectan tu marca con tu público de manera memorable. Desde lanzamientos de productos hasta team buildings y eventos corporativos, creamos experiencias que generan impacto real.',
    p2: 'Nuestro equipo entiende las necesidades del mundo corporativo: puntualidad, profesionalismo y resultados medibles en engagement y satisfacción de participantes.',
    features: [
      { text: 'Activaciones de marca', detail: 'Experiencias inmersivas que conectan con tu audiencia.' },
      { text: 'Team building', detail: 'Dinámicas que fortalecen el trabajo en equipo.' },
      { text: 'Lanzamiento de productos', detail: 'Presentaciones impactantes con show y entretenimiento.' },
      { text: 'Stands interactivos', detail: 'Diseño y montaje de stands para ferias y exposiciones.' },
      { text: 'Fotografía corporativa', detail: 'Registro profesional de cada momento del evento.' },
      { text: 'Catering empresarial', detail: 'Coffee breaks y canapés para ejecutivos y equipos.' },
    ],
    incluye: [
      { icon: '🎯', title: 'Planificación Integral', desc: 'Coordinación completa desde la concepción hasta la ejecución del evento.' },
      { icon: '🎤', title: 'Maestro de Ceremonias', desc: 'Conductor profesional que mantiene el ritmo y la energía del evento.' },
      { icon: '💡', title: 'Diseño de Escenario', desc: 'Montaje visual corporativo alineado con la identidad de tu marca.' },
      { icon: '📸', title: 'Registro Multimedia', desc: 'Fotografía y video profesional de todas las actividades.' },
      { icon: '🤝', title: 'Coordinación Logística', desc: 'Gestión completa de proveedores, equipos y timings del evento.' },
      { icon: '🚗', title: 'Cobertura en Piura', desc: 'Servicio disponible en toda la región Piura y alrededores.' },
    ],
    cta: 'Planifica tu Activación Empresarial',
    ctaDesc: 'Cotizamos sin compromiso y adaptamos la propuesta a tu presupuesto.',
    img: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80',
    relacionados: [
      { title: 'Filmación y Fotografía', icon: '📸', href: '/servicios/filmacion-fotografia', img: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&auto=format&fit=crop' },
      { title: 'Catering y Snacks', icon: '🍽️', href: '/servicios/catering-snacks', img: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop' },
      { title: 'Show Hora Loca', icon: '🎉', href: '/servicios/hora-loca', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop' },
    ],
    waText: 'Hola, me interesa una Activación Empresarial',
    color: '#0369a1',
  },
  'catering-snacks': {
    badge: '🍽️ Catering', title: 'Catering y Carritos Snacks',
    hero: 'Deliciosos snacks, dulces y bebidas para complementar tu celebración con estilo.',
    h2: 'El Sabor que Completa tu Celebración',
    p1: 'Nuestro servicio de catering y carritos snacks agrega ese toque delicioso que hace memorable cada evento. Desde mesas de dulces temáticas hasta carritos de popcorn, algodón de azúcar, helados y mucho más.',
    p2: 'Cada presentación está diseñada para complementar la estética de tu evento, coordinando colores, etiquetas y decoración con la temática elegida.',
    features: [
      { text: 'Carritos de snacks', detail: 'Palomitas, algodón de azúcar, helados y más presentaciones.' },
      { text: 'Mesa de dulces temática', detail: 'Decorada en armonía con los colores y tema del evento.' },
      { text: 'Candy bar personalizado', detail: 'Selección de dulces y chocolates con etiquetas personalizadas.' },
      { text: 'Bebidas y refrescos', detail: 'Dispensadores de bebidas y limonadas artesanales.' },
      { text: 'Snacks salados', detail: 'Empanadas, sándwiches y bocaditos para eventos prolongados.' },
      { text: 'Presentación decorada', detail: 'Todo coordinado con la estética y paleta de colores del evento.' },
    ],
    incluye: [
      { icon: '🍭', title: 'Carritos Temáticos', desc: 'Diseño y montaje de carritos decorados según la temática del evento.' },
      { icon: '🎂', title: 'Mesa de Postres', desc: 'Tortas, cupcakes, macarons y dulces artesanales presentados con elegancia.' },
      { icon: '🍹', title: 'Estación de Bebidas', desc: 'Dispensadores de jugos, limonadas y bebidas especiales.' },
      { icon: '🍿', title: 'Snacks en Vivo', desc: 'Preparación al momento de palomitas, algodón de azúcar y más.' },
      { icon: '🎀', title: 'Etiquetas Personalizadas', desc: 'Branding del evento en todos los envases y presentaciones.' },
      { icon: '🚗', title: 'Servicio en Sechura', desc: 'Instalación y atención durante todo el evento en tu local.' },
    ],
    cta: 'Diseña el Menú de tu Evento',
    ctaDesc: 'Cuéntanos la temática y cantidad de invitados para preparar tu propuesta.',
    img: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&auto=format&fit=crop&q=80',
    relacionados: [
      { title: 'Decoración Temática', icon: '🎨', href: '/servicios/decoracion-tematica', img: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=600&auto=format&fit=crop' },
      { title: 'Shows Infantiles', icon: '🎭', href: '/servicios/shows-infantiles', img: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop' },
      { title: 'Filmación y Fotografía', icon: '📸', href: '/servicios/filmacion-fotografia', img: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&auto=format&fit=crop' },
    ],
    waText: 'Hola, me interesa el servicio de Catering y Snacks',
    color: '#d97706',
  },
  'filmacion-fotografia': {
    badge: '📸 Multimedia', title: 'Filmación y Fotografía',
    hero: 'Capturamos los mejores momentos de tu evento con calidad profesional para que los recuerdes siempre.',
    h2: 'Cada Momento Merece ser Recordado',
    p1: 'Nuestro equipo de fotógrafos y videógrafos profesionales captura la esencia de tu evento con ojos artísticos y equipos de última generación. Desde la decoración hasta las sonrisas más espontáneas.',
    p2: 'Entregamos galería digital de alta resolución, video editado con música y los momentos más especiales en un recuerdo que durará toda la vida.',
    features: [
      { text: 'Fotografía artística', detail: 'Retratos, grupos y momentos clave con composición profesional.' },
      { text: 'Video cinematográfico', detail: 'Filmación con edición profesional, música y color grading.' },
      { text: 'Cobertura completa', detail: 'Desde el montaje hasta el último baile del evento.' },
      { text: 'Galería digital', detail: 'Entrega de todas las fotos en alta resolución via online.' },
      { text: 'Video highlights', detail: 'Resumen de 3-5 minutos con los mejores momentos.' },
      { text: 'Impresión disponible', detail: 'Servicio opcional de impresión de fotos y álbumes.' },
    ],
    incluye: [
      { icon: '📷', title: 'Fotógrafo Profesional', desc: 'Equipo DSLR de alta gama con lentes para cada situación de luz.' },
      { icon: '🎬', title: 'Videógrafo y Edición', desc: 'Filmación en HD/4K y edición profesional con música licenciada.' },
      { icon: '💾', title: 'Galería Online', desc: 'Entrega de todas las fotos en plataforma digital privada.' },
      { icon: '🎵', title: 'Video con Música', desc: 'Edición con soundtrack personalizado y corrección de color.' },
      { icon: '🖨️', title: 'Impresión Disponible', desc: 'Álbumes físicos, photobook y ampliaciones opcionales.' },
      { icon: '🚗', title: 'Cobertura en Sechura', desc: 'Servicio en toda la región Piura y alrededores.' },
    ],
    cta: 'Captura los Momentos de tu Evento',
    ctaDesc: 'Consulta disponibilidad y paquetes para la fecha de tu evento.',
    img: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&auto=format&fit=crop&q=80',
    relacionados: [
      { title: 'Decoración Temática', icon: '🎨', href: '/servicios/decoracion-tematica', img: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=600&auto=format&fit=crop' },
      { title: 'Shows Infantiles', icon: '🎭', href: '/servicios/shows-infantiles', img: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop' },
      { title: 'Show Hora Loca', icon: '🎉', href: '/servicios/hora-loca', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop' },
    ],
    waText: 'Hola, me interesa el servicio de Filmación y Fotografía',
    color: '#059669',
  },
  'decoracion-tematica': {
    badge: '🎨 Decoración', title: 'Decoración Temática',
    hero: 'Ambientación completa y personalizada que transforma cualquier espacio en algo extraordinario.',
    h2: 'Transformamos Espacios en Ambientes Mágicos',
    p1: 'Nuestro equipo de diseño y decoración convierte cualquier local, salón o espacio al aire libre en el escenario perfecto para tu celebración. Cada detalle es cuidadosamente pensado y ejecutado para crear una atmósfera coherente, estética y sorprendente.',
    p2: 'Trabajamos con una amplia variedad de temáticas — desde princesas y superhéroes hasta estilos minimalistas, rústicos, vintage o corporativos — adaptándonos siempre a la visión y el presupuesto del cliente.',
    features: [
      { text: 'Temáticas personalizadas', detail: 'Diseño a medida según los gustos e ideas del cliente.' },
      { text: 'Globoflexia decorativa', detail: 'Arcos, columnas y figuras con globos de colores.' },
      { text: 'Backdrop y photocall', detail: 'Telones decorados para fotos memorables.' },
      { text: 'Centros de mesa', detail: 'Arreglos florales y decorativos para cada mesa.' },
      { text: 'Iluminación ambiental', detail: 'Luces LED, cortinas de luces y efectos especiales.' },
      { text: 'Montaje y desmontaje', detail: 'Nos encargamos de todo antes y después del evento.' },
    ],
    tematicas: [
      { icon: '👸', title: 'Princesas y Fantasía', desc: 'Castillos, coronas, colores pastel y magia para las pequeñas del hogar.' },
      { icon: '🦸', title: 'Superhéroes', desc: 'Colores vibrantes y escudos icónicos para los fanáticos de la acción.' },
      { icon: '🌿', title: 'Boho / Rústico', desc: 'Tonos tierra, flores naturales y materiales artesanales para un ambiente cálido.' },
      { icon: '🌊', title: 'Tropical / Hawái', desc: 'Colores brillantes, flores tropicales y ambiente de verano todo el año.' },
      { icon: '⚫', title: 'Elegante / Minimalista', desc: 'Blanco, negro y dorado con líneas limpias para eventos sofisticados.' },
      { icon: '🎨', title: 'Temática Personalizada', desc: '¿Tienes otra idea? La creamos desde cero según tu visión y preferencias.' },
    ],
    pasos: [
      { num: 1, title: 'Consulta Inicial', desc: 'Conversamos sobre tu visión, temática, colores y presupuesto disponible.' },
      { num: 2, title: 'Propuesta y Diseño', desc: 'Elaboramos una propuesta visual con referencias, paleta de colores y presupuesto.' },
      { num: 3, title: 'Montaje el Día D', desc: 'Llegamos con todo el equipo y montamos la decoración antes del inicio del evento.' },
      { num: 4, title: 'Desmontaje', desc: 'Al finalizar el evento recogemos todo. Tú solo disfrutas sin preocuparte de nada.' },
    ],
    incluye: [
      { icon: '🎀', title: 'Arcos de Globos', desc: 'Estructuras de globos personalizadas que enmarcan el espacio principal del evento.' },
      { icon: '📸', title: 'Backdrop & Photocall', desc: 'Telón decorado temático para fotografías memorables.' },
      { icon: '🌸', title: 'Centros de Mesa', desc: 'Arreglos florales y decorativos coordinados para cada mesa.' },
      { icon: '✨', title: 'Iluminación LED', desc: 'Luces de ambiente, cortinas luminosas y efectos de colores.' },
      { icon: '🎂', title: 'Mesa de Torta', desc: 'Montaje especial y decorado de la mesa principal del evento.' },
      { icon: '🚗', title: 'Montaje Completo', desc: 'Llegamos antes y recogemos todo al terminar. Tú solo disfruta.' },
    ],
    cta: 'Diseñemos Juntos la Decoración de tus Sueños',
    ctaDesc: 'Cuéntanos tu idea y creamos una propuesta personalizada sin compromiso.',
    img: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=1200&auto=format&fit=crop&q=80',
    relacionados: [
      { title: 'Shows Infantiles', icon: '🎭', href: '/servicios/shows-infantiles', img: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop' },
      { title: 'Filmación y Fotografía', icon: '📸', href: '/servicios/filmacion-fotografia', img: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&auto=format&fit=crop' },
      { title: 'Catering y Snacks', icon: '🍽️', href: '/servicios/catering-snacks', img: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop' },
    ],
    waText: 'Hola, me interesa el servicio de Decoración Temática',
    color: '#db2777',
  },
};

function toPlain(d: Record<string, any>): Record<string, any> {
  const r: Record<string, any> = {};
  for (const [k, v] of Object.entries(d)) {
    if (!v || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') r[k] = v;
    else if (Array.isArray(v)) r[k] = v.map((x: any) => typeof x === 'object' && !x?.toDate && !('seconds' in x) ? toPlain(x) : typeof x === 'string' || typeof x === 'number' ? x : String(x));
    else if (v?.toDate) r[k] = v.toDate().toISOString();
    else if (typeof v === 'object' && 'seconds' in v) r[k] = new Date(v.seconds * 1000).toISOString();
    else if (typeof v === 'object') r[k] = toPlain(v);
  }
  return r;
}

// Animated counter hook
function useCounter(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf: number;
    const startTime = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(ease * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return count;
}

export default function ServicioPage() {
  const params = useParams();
  const rawSlug = params?.slug as string;
  const [servicio, setServicio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const statsRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const c1 = useCounter(200, 1600, statsVisible);
  const c2 = useCounter(5, 1200, statsVisible);
  const c3 = useCounter(98, 1400, statsVisible);

  useEffect(() => {
    if (!rawSlug) return;
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'services'), where('visible', '==', true)));
        const match = snap.docs.find(d => {
          const link = d.data().link || '';
          const docSlug = link.replace('servicios/', '').replace('.html', '');
          return docSlug === rawSlug || d.id === rawSlug;
        });
        if (match) setServicio(toPlain({ id: match.id, ...match.data() }));
        else setServicio(null);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [rawSlug]);

  // Stats intersection observer
  useEffect(() => {
    if (!statsRef.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, [loading]);

  // Card reveal observer
  useEffect(() => {
    const cards = document.querySelectorAll('[data-reveal]');
    if (!cards.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setVisibleCards(prev => new Set(prev).add((e.target as HTMLElement).dataset.reveal!));
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    cards.forEach(c => obs.observe(c));
    return () => obs.disconnect();
  }, [loading]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#050d1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ position: 'relative', width: 56, height: 56 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(212,160,23,0.1)', borderTopColor: '#d4a017', animation: 'sp .9s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: '2px solid rgba(212,160,23,0.06)', borderBottomColor: '#f5c842', animation: 'sp 1.4s linear infinite reverse' }} />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', letterSpacing: '.2em', textTransform: 'uppercase', fontFamily: 'var(--font-jakarta)', margin: 0 }}>Cargando servicio</p>
      </div>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const sd = SERVICIOS_DATA[rawSlug] || {};
  // detail map lives inside the Firestore document (like Shows Infantiles)
  const dt = servicio?.detail || {};

  const title   = servicio?.title || sd.title || rawSlug;
  const desc    = dt.hero_desc || servicio?.desc || sd.hero || '';

  // heroMediaSrc es el hero de la página detalle; mediaSrc es la tarjeta del inicio
  const rawMedia     = servicio?.heroMediaSrc || servicio?.mediaSrc || dt.detailImg || '';
  const rawMediaType = servicio?.heroMediaSrc
    ? (servicio?.heroMediaType || 'image')
    : (servicio?.mediaType || (dt.detailImg ? 'video' : 'image'));
  const firestoreMedia = rawMedia;
  const firestoreType  = rawMediaType;
  const mediaSrc = (firestoreMedia && !mediaError) ? firestoreMedia : (sd.img || '');
  const isVideo  = firestoreMedia && !mediaError && firestoreType === 'video';

  // Rich content — Firestore detail map first, then static fallback
  const h2content  = dt.longDescH2 || sd.h2 || '';
  // longDesc is the full paragraph; split it roughly into p1/p2 using '. '
  const longDescFull = dt.longDesc || '';
  const splitIdx   = longDescFull.indexOf('. ', longDescFull.length / 2);
  const p1content  = longDescFull ? (splitIdx > 0 ? longDescFull.slice(0, splitIdx + 1) : longDescFull) : (sd.p1 || '');
  const p2content  = longDescFull && splitIdx > 0 ? longDescFull.slice(splitIdx + 2) : (sd.p2 || '');

  // includes: from Firestore detail.includes (filtered visible), else static
  const firestoreIncludes = (dt.includes || []).filter((i: any) => i.visible !== false);
  const incluyeList = firestoreIncludes.length > 0 ? firestoreIncludes : (sd.incluye || []);

  // features: parse from detail.longDesc2 (✓ bullets) or keep static
  // longDesc2 format: "✓ Text: Detail. ✓ Text2: Detail2. …"
  const featuresList: any[] = (() => {
    if (dt.longDesc2) {
      return dt.longDesc2
        .split('✓')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .map((s: string) => {
          const colonIdx = s.indexOf(':');
          return colonIdx > 0
            ? { text: s.slice(0, colonIdx).trim(), detail: s.slice(colonIdx + 1).trim().replace(/\.$/, '') }
            : { text: s.replace(/\.$/, ''), detail: '' };
        });
    }
    return sd.features || [];
  })();

  // CTA texts — from Firestore detail or static
  const ctaH2text  = dt.ctaH2  || sd.cta    || '¿Listo para reservar?';
  const ctaPtext   = dt.ctaP   || sd.ctaDesc || 'Contáctanos hoy y preparamos una propuesta personalizada sin compromiso.';

  const waText      = sd.waText || `Hola, me interesa ${title}`;
  const accentColor = sd.color  || '#d4a017';
  const ctaLabel    = dt.btn1Text || (rawSlug === 'decoracion-tematica' ? 'Cotizar Decoración' : rawSlug === 'shows-infantiles' ? 'Cotizar Show' : 'Cotizar Ahora');

  if (!h2content && !servicio) return (
    <div style={{ minHeight: '100vh', paddingTop: '8rem', textAlign: 'center', fontFamily: 'var(--font-jakarta)' }}>
      <p style={{ fontSize: '3rem' }}>🎭</p>
      <h1 style={{ color: '#0a1628' }}>{rawSlug}</h1>
      <a href="/" style={{ color: '#d4a017' }}>← Volver al inicio</a>
    </div>
  );

  const isVisible = (id: string) => visibleCards.has(id);

  return (
    <>
      {/* ═══════════════════════════════════════════
          HERO — full-bleed cinematic split
      ═══════════════════════════════════════════ */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', paddingTop: 72 }} className="srv-hero-grid">

        {/* ── LEFT: content panel — dark luxury ── */}
        <div style={{
          position: 'relative', zIndex: 3,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: 'clamp(3rem,6vw,5rem) clamp(2rem,5vw,5rem) clamp(3rem,6vw,5rem) clamp(2rem,7vw,8rem)',
          background: 'linear-gradient(145deg,#050d1a 0%,#0a1628 55%,#0f2040 100%)',
          overflow: 'hidden',
        }}>
          {/* Dot-grid subtle texture */}
          <div style={{ position:'absolute', inset:0, backgroundImage:`radial-gradient(rgba(212,160,23,0.07) 1px,transparent 1px)`, backgroundSize:'28px 28px', pointerEvents:'none' }} />

          {/* Animated glow orbs */}
          <div style={{
            position: 'absolute', width: 500, height: 500, borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}18 0%, transparent 65%)`,
            top: '-20%', right: '-20%', pointerEvents: 'none',
            animation: 'heroOrb 8s ease-in-out infinite alternate',
          }} />
          <div style={{
            position: 'absolute', width: 320, height: 320, borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(212,160,23,0.08) 0%,transparent 70%)',
            bottom: '0%', left: '-10%', pointerEvents: 'none',
            animation: 'heroOrb 12s ease-in-out infinite alternate-reverse',
          }} />

          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '2rem', animation: 'fadeSlideUp .5s ease both', position:'relative', zIndex:2 }}>
            {[['Inicio', '/'], ['Servicios', '/#servicios'], [title, null]].map(([label, href], i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: 'rgba(212,160,23,0.4)', fontSize: '0.65rem' }}>›</span>}
                {href
                  ? <a href={String(href)} style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', textDecoration: 'none', fontFamily: 'var(--font-jakarta)', letterSpacing: '.05em', transition: 'color .2s' }}
                       onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f5c842'}
                       onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'}>{label}</a>
                  : <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', fontFamily: 'var(--font-jakarta)', fontWeight: 600, letterSpacing: '.05em' }}>{label}</span>}
              </span>
            ))}
          </nav>

          {/* Badge */}
          {sd.badge && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content',
              padding: '0.35rem 1rem', borderRadius: 999, marginBottom: '1.5rem',
              background: `${accentColor}20`, border: `1px solid ${accentColor}50`,
              color: '#f5c842', fontSize: '0.65rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.15em', fontFamily: 'var(--font-jakarta)',
              animation: 'fadeSlideUp .5s .08s ease both', position: 'relative', zIndex: 2,
            }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'#f5c842', boxShadow:'0 0 8px #f5c842', animation:'pulse 2s infinite', display:'inline-block' }} />
              {sd.badge}
            </div>
          )}

          {/* Title */}
          <h1 style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'clamp(2.5rem,4.8vw,5rem)',
            color: '#fff', lineHeight: 1.0,
            letterSpacing: '-.04em', margin: '0 0 1.25rem', maxWidth: 540,
            animation: 'fadeSlideUp .55s .15s ease both',
            position: 'relative', zIndex: 2,
            textShadow: '0 2px 20px rgba(0,0,0,0.4)',
          }}>
            {title}
          </h1>

          {/* Accent bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', animation: 'fadeSlideUp .5s .22s ease both', position:'relative', zIndex:2 }}>
            <div style={{ width: 44, height: 3, borderRadius: 2, background: `linear-gradient(90deg,${accentColor},#f5c842)` }} />
            <div style={{ width: 10, height: 3, borderRadius: 2, background: `${accentColor}50` }} />
            <div style={{ width: 5, height: 3, borderRadius: 2, background: `${accentColor}25` }} />
          </div>

          {/* Description */}
          <p style={{
            color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', lineHeight: 1.85,
            maxWidth: 460, margin: '0 0 2.75rem',
            fontFamily: 'var(--font-jakarta)',
            animation: 'fadeSlideUp .55s .28s ease both',
            position: 'relative', zIndex: 2,
          }}>
            {desc}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', animation: 'fadeSlideUp .55s .36s ease both', position:'relative', zIndex:2 }}>
            <a href="/contacto"
               style={{
                 display: 'inline-flex', alignItems: 'center', gap: 10,
                 padding: '0.9rem 2.1rem', borderRadius: 999,
                 background: 'linear-gradient(135deg,#b8860b,#f5c842)',
                 color: '#0a1628', fontWeight: 800, fontSize: '0.88rem', textDecoration: 'none',
                 fontFamily: 'var(--font-jakarta)', letterSpacing: '.04em',
                 boxShadow: '0 4px 24px rgba(212,160,23,0.45)',
                 transition: 'all .3s cubic-bezier(.34,1.4,.64,1)',
                 position: 'relative', overflow: 'hidden',
               }}
               className="srv-cta-dark"
               onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-3px) scale(1.03)'; el.style.boxShadow = '0 12px 36px rgba(212,160,23,0.6)'; }}
               onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 4px 24px rgba(212,160,23,0.45)'; }}>
              {ctaLabel} →
            </a>
            <a href={`https://wa.me/51945203708?text=${encodeURIComponent(waText)}`}
               target="_blank" rel="noopener noreferrer"
               style={{
                 display: 'inline-flex', alignItems: 'center', gap: 8,
                 padding: '0.9rem 2.1rem', borderRadius: 999,
                 background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)',
                 fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none',
                 fontFamily: 'var(--font-jakarta)', letterSpacing: '.04em',
                 border: '1.5px solid rgba(255,255,255,0.15)',
                 transition: 'all .3s cubic-bezier(.34,1.4,.64,1)',
               }}
               onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#25d366'; el.style.color = '#fff'; el.style.background = 'rgba(37,211,102,0.15)'; el.style.transform = 'translateY(-3px) scale(1.02)'; }}
               onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.15)'; el.style.color = 'rgba(255,255,255,0.85)'; el.style.background = 'rgba(255,255,255,0.06)'; el.style.transform = ''; }}>
              💬 WhatsApp
            </a>
          </div>
        </div>

        {/* ── RIGHT: media panel ── */}
        <div style={{ position: 'relative', overflow: 'hidden', background: '#0c1e30', minHeight: 500 }}>
          {/* Media — with fallback on error */}
          {isVideo ? (
            <video ref={videoRef} autoPlay muted loop playsInline
                   onError={() => setMediaError(true)}
                   style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}>
              <source src={cxVideo(mediaSrc)} type="video/mp4" />
              <source src={cxVideo(mediaSrc)} type="video/webm" />
            </video>
          ) : mediaSrc ? (
            <img src={cxHero(mediaSrc)} alt={title}
                 onError={() => setMediaError(true)}
                 decoding="async"
                 style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 10s ease', animation: 'imgZoom 10s ease forwards' }} />
          ) : (
            /* Placeholder when no media */
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, #0c1e30, ${accentColor}30)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '6rem', opacity: 0.3 }}>{sd.badge?.split(' ')[0] || '🎭'}</span>
            </div>
          )}

          {/* Diagonal overlay blending with dark left panel */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(108deg,#050d1a 0%,#0a1628 4%,rgba(10,22,40,0.12) 18%,transparent 35%)',
          }} />

          {/* Bottom vignette */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
            background: 'linear-gradient(to top,rgba(12,30,48,0.75) 0%,rgba(12,30,48,0.2) 60%,transparent 100%)',
          }} />

          {/* Floating glass card */}
          <div style={{
            position: 'absolute', bottom: 32, left: 32, zIndex: 10,
            background: 'rgba(12,30,48,0.65)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 16, padding: '0.9rem 1.25rem',
            boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
            animation: 'fadeSlideUp .6s .5s ease both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'pulse 2s infinite' }} />
              <p style={{ color: '#f5c842', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '.16em', margin: 0, fontFamily: 'var(--font-jakarta)' }}>
                {sd.badge}
              </p>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', margin: 0, fontFamily: 'var(--font-jakarta)' }}>
              J&amp;M Eventos · Sechura, Piura
            </p>
          </div>

          {/* Decorative corner accent */}
          <div style={{
            position: 'absolute', top: 28, right: 28, zIndex: 5,
            width: 56, height: 56, borderRadius: '50%',
            background: `${accentColor}20`,
            border: `1px solid ${accentColor}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem',
            animation: 'float 4s ease-in-out infinite',
          }}>
            {sd.badge?.split(' ')[0] || '✨'}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          STATS BAR — animated counters
      ═══════════════════════════════════════════ */}
      <div ref={statsRef}>
        <section style={{ background: '#0c1e30', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle gradient line top */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${accentColor}60,transparent)` }} />

          <div className="container">
            <div className="srv-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
              {[
                { val: `+${c1}`, label: 'Eventos Realizados', suffix: '' },
                { val: `+${c2}`, label: 'Años de Experiencia', suffix: '' },
                { val: `${c3}%`, label: 'Clientes Satisfechos', suffix: '' },
                { val: 'Piura', label: 'Cobertura Regional', suffix: '', static: true },
              ].map((s, i) => (
                <div key={i}
                     style={{
                       padding: '2.25rem 1.5rem', textAlign: 'center',
                       borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                       position: 'relative', transition: 'background .4s',
                     }}
                     onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${accentColor}0a`}
                     onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <p style={{
                    fontFamily: 'var(--font-playfair)',
                    fontSize: 'clamp(1.7rem,2.5vw,2.4rem)',
                    color: '#f5c842', fontWeight: 700, margin: '0 0 5px', lineHeight: 1,
                  }}>
                    {s.static ? s.val : s.val}
                  </p>
                  <p style={{
                    color: 'rgba(255,255,255,0.32)', fontSize: '0.66rem',
                    textTransform: 'uppercase', letterSpacing: '.14em',
                    margin: 0, fontFamily: 'var(--font-jakarta)', fontWeight: 600,
                  }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${accentColor}30,transparent)` }} />
        </section>
      </div>

      {/* ═══════════════════════════════════════════
          DESCRIPCIÓN + FEATURES — two column
      ═══════════════════════════════════════════ */}
      {h2content && (
        <section style={{ padding: 'clamp(5rem,9vw,8rem) 0', background: '#fff' }}>
          <div className="container">
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 'clamp(3rem,6vw,5rem)' }}
                 data-reveal="desc-header"
                 style2={{ opacity: isVisible('desc-header') ? 1 : 0, transform: isVisible('desc-header') ? 'none' : 'translateY(30px)', transition: 'all .7s ease', textAlign: 'center', marginBottom: 'clamp(3rem,6vw,5rem)' }}>
              <div style={{
                opacity: isVisible('desc-header') ? 1 : 0,
                transform: isVisible('desc-header') ? 'none' : 'translateY(24px)',
                transition: 'all .7s ease',
              }} data-reveal="desc-header">
                <p style={{ color: accentColor, fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.2em', fontFamily: 'var(--font-jakarta)', marginBottom: '0.75rem' }}>
                  {title}
                </p>
                <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(1.9rem,3vw,3rem)', color: '#0c1e30', margin: 0, letterSpacing: '-.03em', lineHeight: 1.1, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
                  {h2content}
                </h2>
              </div>
            </div>

            {/* Two columns */}
            <div className="srv-detail" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(3rem,6vw,7rem)', alignItems: 'start' }}>
              {/* Left */}
              <div data-reveal="desc-left" style={{ opacity: isVisible('desc-left') ? 1 : 0, transform: isVisible('desc-left') ? 'none' : 'translateX(-30px)', transition: 'all .75s .1s ease' }}>
                {p1content && (
                  <p style={{
                    color: '#1a2e42', fontSize: '1.08rem', lineHeight: 1.85,
                    borderLeft: `3px solid ${accentColor}`,
                    paddingLeft: '1.5rem', marginBottom: '1.5rem',
                    fontFamily: 'var(--font-jakarta)',
                  }}>
                    {p1content}
                  </p>
                )}
                {p2content && (
                  <p style={{ color: '#5f7080', fontSize: '0.975rem', lineHeight: 1.85, marginBottom: '2.5rem', fontFamily: 'var(--font-jakarta)' }}>
                    {p2content}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
                  <a href="/contacto" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '0.85rem 2rem', borderRadius: 999,
                    background: `linear-gradient(135deg,#b8860b,${accentColor === '#d4a017' ? '#f5c842' : accentColor})`,
                    color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                    textDecoration: 'none', fontFamily: 'var(--font-jakarta)',
                    boxShadow: `0 4px 20px ${accentColor}40`,
                    transition: 'all .3s cubic-bezier(.34,1.4,.64,1)',
                  }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 10px 28px ${accentColor}55`; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = `0 4px 20px ${accentColor}40`; }}>
                    Cotizar Ahora
                  </a>
                  <a href={`https://wa.me/51945203708?text=${encodeURIComponent(waText)}`}
                     target="_blank" rel="noopener noreferrer"
                     style={{
                       display: 'inline-flex', alignItems: 'center', gap: 8,
                       padding: '0.85rem 2rem', borderRadius: 999,
                       background: '#25d366', color: '#fff',
                       fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none',
                       fontFamily: 'var(--font-jakarta)',
                       boxShadow: '0 4px 20px rgba(37,211,102,0.3)',
                       transition: 'all .3s cubic-bezier(.34,1.4,.64,1)',
                     }}
                     onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 10px 28px rgba(37,211,102,0.45)'; }}
                     onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 4px 20px rgba(37,211,102,0.3)'; }}>
                    💬 WhatsApp
                  </a>
                </div>
              </div>

              {/* Right: features */}
              {featuresList.length > 0 && (
                <div data-reveal="desc-right" style={{ opacity: isVisible('desc-right') ? 1 : 0, transform: isVisible('desc-right') ? 'none' : 'translateX(30px)', transition: 'all .75s .2s ease' }}>
                  {featuresList.map((f: any, i: number) => (
                    <div key={i} className={`srv-feature-item`}
                         style={{
                           display: 'flex', alignItems: 'flex-start', gap: '1rem',
                           padding: '0.875rem 0.75rem',
                           borderBottom: i < featuresList.length - 1 ? '1px solid #f0f3f7' : 'none',
                           borderRadius: 8,
                           transition: 'all .22s ease',
                           cursor: 'default',
                         }}
                         onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = `${accentColor}08`; el.style.paddingLeft = '1.25rem'; el.style.borderBottom = i < featuresList.length - 1 ? `1px solid ${accentColor}20` : 'none'; }}
                         onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.paddingLeft = '0.75rem'; el.style.borderBottom = i < featuresList.length - 1 ? '1px solid #f0f3f7' : 'none'; }}>
                      <span style={{
                        minWidth: 28, height: 20, borderRadius: 999,
                        background: `${accentColor}18`, border: `1px solid ${accentColor}35`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: accentColor, fontSize: '0.58rem', fontWeight: 800,
                        fontFamily: 'var(--font-jakarta)', letterSpacing: '.08em',
                        flexShrink: 0, marginTop: 3,
                      }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <p style={{ color: '#1a2e42', fontWeight: 700, fontSize: '0.875rem', margin: '0 0 2px', fontFamily: 'var(--font-jakarta)' }}>{f.text}</p>
                        {f.detail && <p style={{ color: '#8fa0b0', fontSize: '0.78rem', margin: 0, lineHeight: 1.5, fontFamily: 'var(--font-jakarta)' }}>{f.detail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          ¿QUÉ INCLUYE? — card grid with hover glow
      ═══════════════════════════════════════════ */}
      {incluyeList.length > 0 && (
        <section style={{ padding: 'clamp(5rem,9vw,8rem) 0', background: '#f7f7f4', position: 'relative', overflow: 'hidden' }}>
          {/* Background accent blob */}
          <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle,${accentColor}08 0%,transparent 65%)`, pointerEvents: 'none' }} />

          <div className="container" style={{ position: 'relative' }}>
            <div data-reveal="inc-header" style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4rem)', opacity: isVisible('inc-header') ? 1 : 0, transform: isVisible('inc-header') ? 'none' : 'translateY(24px)', transition: 'all .7s ease' }}>
              <p style={{ color: accentColor, fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.2em', fontFamily: 'var(--font-jakarta)', marginBottom: '0.75rem' }}>Incluido en el servicio</p>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(1.7rem,2.5vw,2.5rem)', color: '#0c1e30', margin: 0, letterSpacing: '-.03em' }}>
                Todo lo que Necesitas en un Solo Paquete
              </h2>
            </div>

            <div className="srv-includes" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
              {incluyeList.map((item: any, i: number) => {
                const rid = `inc-${i}`;
                return (
                  <div key={i} data-reveal={rid}
                       style={{
                         background: '#fff', borderRadius: 18,
                         border: '1.5px solid #ece9e2',
                         padding: '1.6rem',
                         opacity: isVisible(rid) ? 1 : 0,
                         transform: isVisible(rid) ? 'none' : 'translateY(28px)',
                         transition: `all .6s ${i * 0.08}s ease`,
                         cursor: 'default', position: 'relative', overflow: 'hidden',
                       }}
                       onMouseEnter={e => {
                         const el = e.currentTarget as HTMLElement;
                         el.style.borderColor = accentColor + '70';
                         el.style.transform = 'translateY(-6px)';
                         el.style.boxShadow = `0 16px 40px rgba(12,30,48,0.1), 0 0 0 1px ${accentColor}30`;
                       }}
                       onMouseLeave={e => {
                         const el = e.currentTarget as HTMLElement;
                         el.style.borderColor = '#ece9e2';
                         el.style.transform = '';
                         el.style.boxShadow = '';
                       }}>
                    {/* Hover gradient top */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${accentColor},${accentColor}60,transparent)`, opacity: 0, transition: 'opacity .3s' }} className="srv-card-top" />
                    <div style={{
                      width: 50, height: 50, borderRadius: 14,
                      background: `linear-gradient(135deg,${accentColor}18,${accentColor}08)`,
                      border: `1px solid ${accentColor}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.5rem', marginBottom: '1.1rem',
                    }}>
                      {item.icon}
                    </div>
                    <h3 style={{ color: '#0c1e30', fontSize: '0.88rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', margin: '0 0 7px' }}>{item.title}</h3>
                    <p style={{ color: '#7a8a9a', fontSize: '0.8rem', lineHeight: 1.65, margin: 0, fontFamily: 'var(--font-jakarta)' }}>{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          TEMÁTICAS — solo decoración
      ═══════════════════════════════════════════ */}
      {sd.tematicas?.length > 0 && (
        <section style={{ padding: 'clamp(5rem,9vw,8rem) 0', background: '#fff' }}>
          <div className="container">
            <div data-reveal="tem-header" style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4rem)', opacity: isVisible('tem-header') ? 1 : 0, transform: isVisible('tem-header') ? 'none' : 'translateY(24px)', transition: 'all .7s ease' }}>
              <p style={{ color: accentColor, fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.2em', fontFamily: 'var(--font-jakarta)', marginBottom: '0.75rem' }}>Estilos disponibles</p>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(1.7rem,2.5vw,2.5rem)', color: '#0c1e30', margin: 0, letterSpacing: '-.03em' }}>Temáticas Más Populares</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '1rem' }}>
              {sd.tematicas.map((t: any, i: number) => {
                const palettes = [
                  { bg: '#fef9ee', border: '#f5c842', text: '#92660a' },
                  { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
                  { bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
                  { bg: '#fdf4ff', border: '#d8b4fe', text: '#7e22ce' },
                  { bg: '#fff1f2', border: '#fda4af', text: '#be123c' },
                  { bg: '#f0fdfa', border: '#5eead4', text: '#0f766e' },
                ];
                const p = palettes[i % palettes.length];
                const rid = `tem-${i}`;
                return (
                  <div key={i} data-reveal={rid}
                       style={{
                         padding: '1.75rem', borderRadius: 20,
                         background: p.bg, border: `1.5px solid ${p.border}60`,
                         opacity: isVisible(rid) ? 1 : 0,
                         transform: isVisible(rid) ? 'none' : 'translateY(24px)',
                         transition: `all .6s ${i * 0.07}s ease`,
                       }}
                       onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-5px) scale(1.01)'; el.style.boxShadow = `0 12px 36px ${p.border}40`; el.style.borderColor = p.border; }}
                       onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = ''; el.style.borderColor = `${p.border}60`; }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: '0.875rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>{t.icon}</div>
                    <h3 style={{ color: '#0c1e30', fontSize: '0.9rem', fontFamily: 'var(--font-playfair)', fontWeight: 700, margin: '0 0 7px' }}>{t.title}</h3>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.65, margin: 0, fontFamily: 'var(--font-jakarta)' }}>{t.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          PROCESO — solo decoración, timeline
      ═══════════════════════════════════════════ */}
      {sd.pasos?.length > 0 && (
        <section style={{ padding: 'clamp(5rem,9vw,8rem) 0', background: '#0c1e30', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${accentColor}18 1px,transparent 1px)`, backgroundSize: '32px 32px', opacity: 0.6 }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 400, borderRadius: '50%', background: `radial-gradient(ellipse,${accentColor}10 0%,transparent 60%)`, pointerEvents: 'none' }} />

          <div className="container" style={{ position: 'relative' }}>
            <div data-reveal="steps-header" style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4rem)', opacity: isVisible('steps-header') ? 1 : 0, transform: isVisible('steps-header') ? 'none' : 'translateY(24px)', transition: 'all .7s ease' }}>
              <p style={{ color: `${accentColor}aa`, fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.2em', fontFamily: 'var(--font-jakarta)', marginBottom: '0.75rem' }}>Nuestro Proceso</p>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(1.7rem,2.5vw,2.5rem)', color: '#fff', margin: 0, letterSpacing: '-.03em' }}>Tu Decoración en 4 Pasos</h2>
            </div>

            <div style={{ position: 'relative' }}>
              {/* Line connector */}
              <div className="srv-timeline-line" style={{
                position: 'absolute', top: 24,
                left: 'calc(12.5% + 20px)', right: 'calc(12.5% + 20px)',
                height: 1,
                background: `linear-gradient(90deg,transparent,${accentColor}80 20%,${accentColor} 50%,${accentColor}80 80%,transparent)`,
                zIndex: 0,
              }} />
              <div className="srv-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
                {sd.pasos.map((p: any, i: number) => {
                  const rid = `step-${i}`;
                  return (
                    <div key={i} data-reveal={rid}
                         style={{
                           display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                           opacity: isVisible(rid) ? 1 : 0,
                           transform: isVisible(rid) ? 'none' : 'translateY(28px)',
                           transition: `all .65s ${i * 0.12}s ease`,
                         }}>
                      {/* Circle */}
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: `linear-gradient(135deg,#b8860b,${accentColor === '#db2777' ? '#f472b6' : '#f5c842'})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: 800,
                        color: '#0c1e30', marginBottom: '1.5rem', flexShrink: 0,
                        border: '3px solid #0c1e30',
                        boxShadow: `0 0 0 4px ${accentColor}25, 0 0 0 8px ${accentColor}10`,
                        zIndex: 2, position: 'relative',
                      }}>
                        {p.num}
                      </div>
                      <div style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 16, padding: '1.25rem',
                        backdropFilter: 'blur(8px)', width: '100%',
                        transition: 'all .3s',
                      }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.07)'; el.style.borderColor = `${accentColor}40`; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.04)'; el.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                        <h3 style={{ color: '#fff', fontSize: '0.88rem', fontFamily: 'var(--font-playfair)', fontWeight: 700, margin: '0 0 7px' }}>{p.title}</h3>
                        <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.78rem', lineHeight: 1.65, margin: 0, fontFamily: 'var(--font-jakarta)' }}>{p.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          RELACIONADOS — cards with parallax hover
      ═══════════════════════════════════════════ */}
      {sd.relacionados?.length > 0 && (
        <section style={{ padding: 'clamp(5rem,9vw,8rem) 0', background: '#fafaf8' }}>
          <div className="container">
            <div data-reveal="rel-header" style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4rem)', opacity: isVisible('rel-header') ? 1 : 0, transform: isVisible('rel-header') ? 'none' : 'translateY(24px)', transition: 'all .7s ease' }}>
              <p style={{ color: accentColor, fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.2em', fontFamily: 'var(--font-jakarta)', marginBottom: '0.75rem' }}>Otros Servicios</p>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(1.7rem,2.5vw,2.5rem)', color: '#0c1e30', margin: 0, letterSpacing: '-.03em' }}>También Te Puede Interesar</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.25rem' }}>
              {sd.relacionados.map((r: any, i: number) => {
                const rid = `rel-${i}`;
                return (
                  <a key={i} href={r.href} style={{ textDecoration: 'none', display: 'block' }}
                     data-reveal={rid}>
                    <div style={{
                      borderRadius: 20, overflow: 'hidden', background: '#fff',
                      boxShadow: '0 1px 8px rgba(12,30,48,0.06)',
                      opacity: isVisible(rid) ? 1 : 0,
                      transform: isVisible(rid) ? 'none' : 'translateY(24px)',
                      transition: `all .65s ${i * 0.1}s ease`,
                    }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-8px)'; el.style.boxShadow = '0 24px 50px rgba(12,30,48,0.15)'; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 1px 8px rgba(12,30,48,0.06)'; }}>
                      <div style={{ height: 220, overflow: 'hidden', position: 'relative' }}>
                        <img src={cxCard(r.img)} alt={r.title} loading="lazy" decoding="async"
                             style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .6s cubic-bezier(.25,.46,.45,.94)' }}
                             onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'}
                             onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'} />
                        {/* Gradient */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(12,30,48,0.5) 0%,transparent 50%)' }} />
                        {/* Icon badge */}
                        <div style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '0.4rem 0.7rem', fontSize: '1.1rem' }}>
                          {r.icon}
                        </div>
                      </div>
                      <div style={{ padding: '1.25rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ color: '#0c1e30', fontSize: '0.92rem', fontFamily: 'var(--font-playfair)', fontWeight: 700, margin: 0 }}>{r.title}</h3>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: `${accentColor}15`, border: `1px solid ${accentColor}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: accentColor, fontSize: '0.85rem', fontWeight: 700,
                          transition: 'all .3s',
                          flexShrink: 0,
                        }}
                          className="srv-rel-arrow">
                          →
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          CTA FINAL — immersive dark section
      ═══════════════════════════════════════════ */}
      <section style={{ padding: 'clamp(5rem,10vw,9rem) 0', background: '#0c1e30', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Animated dot grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${accentColor}22 1px,transparent 1px)`, backgroundSize: '26px 26px', animation: 'gridPan 20s linear infinite' }} />
        {/* Glows */}
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 500, borderRadius: '50%', background: `radial-gradient(ellipse,${accentColor}14 0%,transparent 60%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(212,160,23,0.08) 0%,transparent 65%)', pointerEvents: 'none' }} />

        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div data-reveal="cta-content" style={{ opacity: isVisible('cta-content') ? 1 : 0, transform: isVisible('cta-content') ? 'none' : 'translateY(30px)', transition: 'all .8s ease' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0.35rem 1rem', borderRadius: 999, marginBottom: '1.5rem',
              background: `${accentColor}18`, border: `1px solid ${accentColor}40`,
              color: '#f5c842', fontSize: '0.65rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.18em', fontFamily: 'var(--font-jakarta)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f5c842', boxShadow: '0 0 8px #f5c842', animation: 'pulse 2s infinite', display: 'block' }} />
              ¿Listo para comenzar?
            </div>
            <h2 style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: 'clamp(2rem,4vw,3.5rem)',
              color: '#fff', lineHeight: 1.1,
              letterSpacing: '-.03em',
              maxWidth: 680, margin: '0 auto 1.25rem',
            }}>
              {ctaH2text}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '1rem', lineHeight: 1.8, maxWidth: 480, margin: '0 auto 3rem', fontFamily: 'var(--font-jakarta)' }}>
              {ctaPtext}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              <a href="/contacto" style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '1.05rem 2.5rem', borderRadius: 999,
                background: 'linear-gradient(135deg,#b8860b,#f5c842)',
                color: '#0c1e30', fontWeight: 800, fontSize: '0.95rem',
                textDecoration: 'none', fontFamily: 'var(--font-jakarta)',
                boxShadow: '0 6px 30px rgba(212,160,23,0.45)',
                letterSpacing: '.04em', transition: 'all .3s cubic-bezier(.34,1.4,.64,1)',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px) scale(1.03)'; el.style.boxShadow = '0 14px 40px rgba(212,160,23,0.6)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 6px 30px rgba(212,160,23,0.45)'; }}>
                Solicitar Cotización →
              </a>
              <a href={`https://wa.me/51945203708?text=${encodeURIComponent(waText)}`}
                 target="_blank" rel="noopener noreferrer"
                 style={{
                   display: 'inline-flex', alignItems: 'center', gap: 10,
                   padding: '1.05rem 2.5rem', borderRadius: 999,
                   background: '#25d366', color: '#fff',
                   fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none',
                   fontFamily: 'var(--font-jakarta)', letterSpacing: '.04em',
                   boxShadow: '0 6px 30px rgba(37,211,102,0.4)',
                   transition: 'all .3s cubic-bezier(.34,1.4,.64,1)',
                 }}
                 onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px) scale(1.03)'; el.style.boxShadow = '0 14px 40px rgba(37,211,102,0.55)'; }}
                 onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 6px 30px rgba(37,211,102,0.4)'; }}>
                💬 WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        /* Core keyframes */
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroOrb {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(30px,20px) scale(1.08); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-12px) rotate(5deg); }
        }
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.5; transform:scale(1.4); }
        }
        @keyframes imgZoom {
          from { transform: scale(1); }
          to   { transform: scale(1.06); }
        }
        @keyframes gridPan {
          from { background-position: 0 0; }
          to   { background-position: 52px 52px; }
        }

        /* CTA dark button shimmer */
        .srv-cta-dark::after {
          content:'';
          position:absolute;
          top:0; left:-100%; width:60%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent);
          transform:skewX(-20deg);
          transition:none;
        }
        .srv-cta-dark:hover::after {
          left:140%;
          transition:left .55s ease;
        }

        /* Card top accent on hover */
        .srv-card-top { opacity: 0; }
        div:hover > .srv-card-top { opacity: 1 !important; }

        /* Related card arrow */
        a:hover .srv-rel-arrow {
          background: var(--accent,#d4a017) !important;
          color: #fff !important;
          transform: translateX(4px);
        }

        /* Responsive */
        @media (max-width: 960px) {
          .srv-hero-grid { grid-template-columns: 1fr !important; }
          .srv-hero-grid > div:last-child { min-height: 360px !important; order: -1; }
          .srv-detail { grid-template-columns: 1fr !important; gap: 2.5rem !important; }
          .srv-includes { grid-template-columns: repeat(2,1fr) !important; }
          .srv-stats { grid-template-columns: repeat(2,1fr) !important; }
          .srv-stats > div:nth-child(2) { border-right: none !important; }
          .srv-stats > div:nth-child(3) { border-right: 1px solid rgba(255,255,255,0.06) !important; }
        }
        @media (max-width: 640px) {
          .srv-includes { grid-template-columns: 1fr !important; }
          .srv-stats { grid-template-columns: repeat(2,1fr) !important; }
          .srv-steps { grid-template-columns: repeat(2,1fr) !important; }
          .srv-timeline-line { display: none !important; }
        }
        @media (max-width: 860px) {
          .srv-steps { grid-template-columns: repeat(2,1fr) !important; }
          .srv-timeline-line { display: none !important; }
        }
      `}</style>
    </>
  );
}
