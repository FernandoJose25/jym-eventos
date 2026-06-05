const runMigration = async () => {
  const { getApp } =
    await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js');
  const { getFirestore, collection, query, where, getDocs, updateDoc } =
    await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js');

  // Usa el app ya inicializado por el panel admin — no crea uno nuevo
  const app = getApp();
  const db  = getFirestore(app);

  // ── Datos completos para cada servicio ───────────────────────
  const MIGRATIONS = {

    /* ──────────────────────────────────────────────────────────
       HORA LOCA
    ────────────────────────────────────────────────────────── */
    'hora-loca': {
      // Campos raíz
      title:     'Show Hora Loca',
      desc:      'Animación explosiva con juegos, concursos, música y mucha energía para toda la familia.',
      mediaSrc:  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
      mediaType: 'image',
      icon:      '🎉',
      order:     1,
      visible:   true,
      link:      'servicios/hora-loca.html',
      // Mapa detail completo
      detail: {
        hero_visible:    true,
        detalle_visible: true,
        incluye_visible: true,
        cta_visible:     true,
        complementa_visible: true,

        hero_desc:   'Animación explosiva con juegos, concursos, música y mucha energía para toda la familia.',
        h1:          'Show Hora Loca',
        eyebrow:     'Nuestros Servicios',
        badgeText:   '🎉 Hora Loca',

        detalleLabel: 'Show Hora Loca',
        longDescH2:   'Una Hora de Pura Energía y Diversión',
        longDesc:     'El Show Hora Loca es la animación perfecta para animar cualquier tipo de evento: cumpleaños, bodas, bautizos, fiestas de promoción o reuniones familiares. Nuestros animadores son expertos en romper el hielo y llevar la energía al máximo.',
        longDesc2:    '✓ Animadores energéticos: Profesionales con gran carisma y experiencia en animación grupal. ✓ Accesorios locos: Sombreros, antifaces, lentes y props divertidos para todos. ✓ Juegos y retos: Dinámicas interactivas pensadas para integrar a todos los asistentes. ✓ Música en vivo / DJ: Playlist vibrante y adaptada al público del evento. ✓ Lluvia de serpentinas: El momento más esperado y fotogénico de la fiesta. ✓ Premiaciones: Reconocimiento especial para los participantes más activos. ',
        detailImg:    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
        detailImgPos: 'center center',

        incluye_label: '¿Qué Incluye?',
        incluye_h2:    'Todo lo que Necesitas en un Solo Paquete',
        includes: [
          { icon: '🎤', title: 'Animador Principal',      desc: 'Conductor del show con micrófono y experiencia en grandes grupos.',                     visible: true },
          { icon: '🎵', title: 'Equipo de Sonido',         desc: 'Parlantes profesionales para que la música se sienta en todo el local.',                visible: true },
          { icon: '🎊', title: 'Accesorios y Props',       desc: 'Set completo de accesorios locos para los invitados durante el show.',                   visible: true },
          { icon: '🌟', title: 'Serpentinas y Confeti',    desc: 'El clímax del show con lluvia de color para todos los asistentes.',                      visible: true },
          { icon: '🏆', title: 'Premios para Juegos',      desc: 'Detallitos y sorpresas para premiar a los participantes ganadores.',                     visible: true },
          { icon: '🚗', title: 'Movilización en Sechura',  desc: 'Llegamos a tu local o domicilio en cualquier distrito de Piura.',                        visible: true },
        ],

        btn1Text: 'Cotizar Show',
        btn1Url:  '../contacto.html',
        btn2Text: 'WhatsApp',
        btn2Url:  'https://wa.me/51945203708',

        ctaLabel: '¿Listo para reservar?',
        ctaH2:    'Reserva tu Show Hora Loca Hoy',
        ctaP:     'Contáctanos y diseñamos la animación perfecta para tu evento.',
        ctaBtn:   'Solicitar Cotización',
        ctaUrl:   '../contacto.html',

        complementa_label: 'También Te Puede Interesar',
        complementa_h2:    'Complementa tu Evento',
      },
    },

    /* ──────────────────────────────────────────────────────────
       ACTIVACIONES EMPRESARIALES
    ────────────────────────────────────────────────────────── */
    'activaciones-empresariales': {
      title:     'Activaciones Empresariales',
      desc:      'Eventos corporativos y activaciones de marca con entretenimiento profesional para tu empresa.',
      mediaSrc:  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80',
      mediaType: 'image',
      icon:      '🏢',
      order:     2,
      visible:   true,
      link:      'servicios/activaciones-empresariales.html',
      detail: {
        hero_visible:    true,
        detalle_visible: true,
        incluye_visible: true,
        cta_visible:     true,
        complementa_visible: true,

        hero_desc:   'Eventos corporativos y activaciones de marca con entretenimiento profesional para tu empresa.',
        h1:          'Activaciones Empresariales',
        eyebrow:     'Nuestros Servicios',
        badgeText:   '🏢 Empresarial',

        detalleLabel: 'Activaciones Empresariales',
        longDescH2:   'Activaciones que Generan Impacto de Marca',
        longDesc:     'Diseñamos activaciones empresariales que conectan tu marca con tu público de manera memorable. Desde lanzamientos de productos hasta team buildings y eventos corporativos, creamos experiencias que generan impacto real. Nuestro equipo entiende las necesidades del mundo corporativo: puntualidad, profesionalismo y resultados medibles en engagement y satisfacción de participantes.',
        longDesc2:    '✓ Activaciones de marca: Experiencias inmersivas que conectan con tu audiencia. ✓ Team building: Dinámicas que fortalecen el trabajo en equipo. ✓ Lanzamiento de productos: Presentaciones impactantes con show y entretenimiento. ✓ Stands interactivos: Diseño y montaje de stands para ferias y exposiciones. ✓ Fotografía corporativa: Registro profesional de cada momento del evento. ✓ Catering empresarial: Coffee breaks y canapés para ejecutivos y equipos. ',
        detailImg:    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80',
        detailImgPos: 'center center',

        incluye_label: '¿Qué Incluye?',
        incluye_h2:    'Todo lo que Necesitas en un Solo Paquete',
        includes: [
          { icon: '🎯', title: 'Planificación Integral',   desc: 'Coordinación completa desde la concepción hasta la ejecución del evento.',                visible: true },
          { icon: '🎤', title: 'Maestro de Ceremonias',    desc: 'Conductor profesional que mantiene el ritmo y la energía del evento.',                    visible: true },
          { icon: '💡', title: 'Diseño de Escenario',      desc: 'Montaje visual corporativo alineado con la identidad de tu marca.',                       visible: true },
          { icon: '📸', title: 'Registro Multimedia',      desc: 'Fotografía y video profesional de todas las actividades.',                                 visible: true },
          { icon: '🤝', title: 'Coordinación Logística',   desc: 'Gestión completa de proveedores, equipos y timings del evento.',                          visible: true },
          { icon: '🚗', title: 'Cobertura en Piura',       desc: 'Servicio disponible en toda la región Piura y alrededores.',                              visible: true },
        ],

        btn1Text: 'Cotizar Ahora',
        btn1Url:  '../contacto.html',
        btn2Text: 'WhatsApp',
        btn2Url:  'https://wa.me/51945203708',

        ctaLabel: '¿Listo para reservar?',
        ctaH2:    'Planifica tu Activación Empresarial',
        ctaP:     'Cotizamos sin compromiso y adaptamos la propuesta a tu presupuesto.',
        ctaBtn:   'Solicitar Cotización',
        ctaUrl:   '../contacto.html',

        complementa_label: 'También Te Puede Interesar',
        complementa_h2:    'Complementa tu Evento',
      },
    },

    /* ──────────────────────────────────────────────────────────
       CATERING Y CARRITOS SNACKS
    ────────────────────────────────────────────────────────── */
    'catering-snacks': {
      title:     'Catering y Carritos Snacks',
      desc:      'Deliciosos snacks, dulces y bebidas para complementar tu celebración con estilo.',
      mediaSrc:  'https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&auto=format&fit=crop&q=80',
      mediaType: 'image',
      icon:      '🍽️',
      order:     3,
      visible:   true,
      link:      'servicios/catering-snacks.html',
      detail: {
        hero_visible:    true,
        detalle_visible: true,
        incluye_visible: true,
        cta_visible:     true,
        complementa_visible: true,

        hero_desc:   'Deliciosos snacks, dulces y bebidas para complementar tu celebración con estilo.',
        h1:          'Catering y Carritos Snacks',
        eyebrow:     'Nuestros Servicios',
        badgeText:   '🍽️ Catering',

        detalleLabel: 'Catering y Carritos Snacks',
        longDescH2:   'El Sabor que Completa tu Celebración',
        longDesc:     'Nuestro servicio de catering y carritos snacks agrega ese toque delicioso que hace memorable cada evento. Desde mesas de dulces temáticas hasta carritos de popcorn, algodón de azúcar, helados y mucho más. Cada presentación está diseñada para complementar la estética de tu evento.',
        longDesc2:    '✓ Carritos de snacks: Palomitas, algodón de azúcar, helados y más presentaciones. ✓ Mesa de dulces temática: Decorada en armonía con los colores y tema del evento. ✓ Candy bar personalizado: Selección de dulces y chocolates con etiquetas personalizadas. ✓ Bebidas y refrescos: Dispensadores de bebidas y limonadas artesanales. ✓ Snacks salados: Empanadas, sándwiches y bocaditos para eventos prolongados. ✓ Presentación decorada: Todo coordinado con la estética y paleta de colores del evento. ',
        detailImg:    'https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&auto=format&fit=crop&q=80',
        detailImgPos: 'center center',

        incluye_label: '¿Qué Incluye?',
        incluye_h2:    'Todo lo que Necesitas en un Solo Paquete',
        includes: [
          { icon: '🍭', title: 'Carritos Temáticos',        desc: 'Diseño y montaje de carritos decorados según la temática del evento.',                    visible: true },
          { icon: '🎂', title: 'Mesa de Postres',            desc: 'Tortas, cupcakes, macarons y dulces artesanales presentados con elegancia.',             visible: true },
          { icon: '🍹', title: 'Estación de Bebidas',        desc: 'Dispensadores de jugos, limonadas y bebidas especiales.',                                visible: true },
          { icon: '🍿', title: 'Snacks en Vivo',             desc: 'Preparación al momento de palomitas, algodón de azúcar y más.',                          visible: true },
          { icon: '🎀', title: 'Etiquetas Personalizadas',   desc: 'Branding del evento en todos los envases y presentaciones.',                             visible: true },
          { icon: '🚗', title: 'Servicio en Sechura',        desc: 'Instalación y atención durante todo el evento en tu local.',                             visible: true },
        ],

        btn1Text: 'Cotizar Menú',
        btn1Url:  '../contacto.html',
        btn2Text: 'WhatsApp',
        btn2Url:  'https://wa.me/51945203708',

        ctaLabel: '¿Listo para reservar?',
        ctaH2:    'Diseña el Menú de tu Evento',
        ctaP:     'Cuéntanos la temática y cantidad de invitados para preparar tu propuesta.',
        ctaBtn:   'Solicitar Cotización',
        ctaUrl:   '../contacto.html',

        complementa_label: 'También Te Puede Interesar',
        complementa_h2:    'Complementa tu Evento',
      },
    },

    /* ──────────────────────────────────────────────────────────
       FILMACIÓN Y FOTOGRAFÍA
    ────────────────────────────────────────────────────────── */
    'filmacion-fotografia': {
      title:     'Filmación y Fotografía',
      desc:      'Capturamos los mejores momentos de tu evento con calidad profesional para que los recuerdes siempre.',
      mediaSrc:  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&auto=format&fit=crop&q=80',
      mediaType: 'image',
      icon:      '📸',
      order:     4,
      visible:   true,
      link:      'servicios/filmacion-fotografia.html',
      detail: {
        hero_visible:    true,
        detalle_visible: true,
        incluye_visible: true,
        cta_visible:     true,
        complementa_visible: true,

        hero_desc:   'Capturamos los mejores momentos de tu evento con calidad profesional para que los recuerdes siempre.',
        h1:          'Filmación y Fotografía',
        eyebrow:     'Nuestros Servicios',
        badgeText:   '📸 Multimedia',

        detalleLabel: 'Filmación y Fotografía',
        longDescH2:   'Cada Momento Merece ser Recordado',
        longDesc:     'Nuestro equipo de fotógrafos y videógrafos profesionales captura la esencia de tu evento con ojos artísticos y equipos de última generación. Desde la decoración hasta las sonrisas más espontáneas. Entregamos galería digital de alta resolución, video editado con música y los momentos más especiales en un recuerdo que durará toda la vida.',
        longDesc2:    '✓ Fotografía artística: Retratos, grupos y momentos clave con composición profesional. ✓ Video cinematográfico: Filmación con edición profesional, música y color grading. ✓ Cobertura completa: Desde el montaje hasta el último baile del evento. ✓ Galería digital: Entrega de todas las fotos en alta resolución via online. ✓ Video highlights: Resumen de 3-5 minutos con los mejores momentos. ✓ Impresión disponible: Servicio opcional de impresión de fotos y álbumes. ',
        detailImg:    'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&auto=format&fit=crop&q=80',
        detailImgPos: 'center center',

        incluye_label: '¿Qué Incluye?',
        incluye_h2:    'Todo lo que Necesitas en un Solo Paquete',
        includes: [
          { icon: '📷', title: 'Fotógrafo Profesional',    desc: 'Equipo DSLR de alta gama con lentes para cada situación de luz.',                         visible: true },
          { icon: '🎬', title: 'Videógrafo y Edición',     desc: 'Filmación en HD/4K y edición profesional con música licenciada.',                         visible: true },
          { icon: '💾', title: 'Galería Online',            desc: 'Entrega de todas las fotos en plataforma digital privada.',                               visible: true },
          { icon: '🎵', title: 'Video con Música',          desc: 'Edición con soundtrack personalizado y corrección de color.',                             visible: true },
          { icon: '🖨️', title: 'Impresión Disponible',     desc: 'Álbumes físicos, photobook y ampliaciones opcionales.',                                   visible: true },
          { icon: '🚗', title: 'Cobertura en Sechura',     desc: 'Servicio en toda la región Piura y alrededores.',                                         visible: true },
        ],

        btn1Text: 'Consultar Disponibilidad',
        btn1Url:  '../contacto.html',
        btn2Text: 'WhatsApp',
        btn2Url:  'https://wa.me/51945203708',

        ctaLabel: '¿Listo para reservar?',
        ctaH2:    'Captura los Momentos de tu Evento',
        ctaP:     'Consulta disponibilidad y paquetes para la fecha de tu evento.',
        ctaBtn:   'Solicitar Cotización',
        ctaUrl:   '../contacto.html',

        complementa_label: 'También Te Puede Interesar',
        complementa_h2:    'Complementa tu Evento',
      },
    },

    /* ──────────────────────────────────────────────────────────
       DECORACIÓN TEMÁTICA
    ────────────────────────────────────────────────────────── */
    'decoracion-tematica': {
      title:     'Decoración Temática',
      desc:      'Ambientación completa con temas personalizados y colores vibrantes.',
      mediaSrc:  'https://images.unsplash.com/photo-1778876505989-77a541faab20?q=80&w=735&auto=format&fit=crop',
      mediaType: 'image',
      icon:      '🎨',
      order:     5,
      visible:   true,
      link:      'servicios/decoracion-tematica.html',
      detail: {
        hero_visible:    true,
        detalle_visible: true,
        incluye_visible: true,
        cta_visible:     true,
        complementa_visible: true,

        hero_desc:   'Ambientación completa y personalizada que transforma cualquier espacio en algo extraordinario.',
        h1:          'Decoración Temática',
        eyebrow:     'Nuestros Servicios',
        badgeText:   '🎨 Decoración',

        detalleLabel: 'Decoración Temática',
        longDescH2:   'Transformamos Espacios en Ambientes Mágicos',
        longDesc:     'Nuestro equipo de diseño y decoración convierte cualquier local, salón o espacio al aire libre en el escenario perfecto para tu celebración. Cada detalle es cuidadosamente pensado y ejecutado para crear una atmósfera coherente, estética y sorprendente. Trabajamos con una amplia variedad de temáticas — desde princesas y superhéroes hasta estilos minimalistas, rústicos o corporativos.',
        longDesc2:    '✓ Temáticas personalizadas: Diseño a medida según los gustos e ideas del cliente. ✓ Globoflexia decorativa: Arcos, columnas y figuras con globos de colores. ✓ Backdrop y photocall: Telones decorados para fotos memorables. ✓ Centros de mesa: Arreglos florales y decorativos para cada mesa. ✓ Iluminación ambiental: Luces LED, cortinas de luces y efectos especiales. ✓ Montaje y desmontaje: Nos encargamos de todo antes y después del evento. ',
        detailImg:    'https://images.unsplash.com/photo-1778876505989-77a541faab20?q=80&w=735&auto=format&fit=crop',
        detailImgPos: 'center center',

        incluye_label: '¿Qué Incluye?',
        incluye_h2:    'Todo lo que Necesitas en un Solo Paquete',
        includes: [
          { icon: '🎀', title: 'Arcos de Globos',            desc: 'Estructuras de globos personalizadas que enmarcan el espacio principal del evento.',    visible: true },
          { icon: '📸', title: 'Backdrop & Photocall',       desc: 'Telón decorado temático para fotografías memorables.',                                  visible: true },
          { icon: '🌸', title: 'Centros de Mesa',            desc: 'Arreglos florales y decorativos coordinados para cada mesa.',                           visible: true },
          { icon: '✨', title: 'Iluminación LED',             desc: 'Luces de ambiente, cortinas luminosas y efectos de colores.',                          visible: true },
          { icon: '🎂', title: 'Mesa de Torta',              desc: 'Montaje especial y decorado de la mesa principal del evento.',                          visible: true },
          { icon: '🚗', title: 'Montaje y Desmontaje',       desc: 'Llegamos antes y recogemos todo al terminar. Tú solo disfruta.',                        visible: true },
        ],

        btn1Text: 'Cotizar Decoración',
        btn1Url:  '../contacto.html',
        btn2Text: 'WhatsApp',
        btn2Url:  'https://wa.me/51945203708',

        ctaLabel: '¿Listo para reservar?',
        ctaH2:    'Diseñemos Juntos la Decoración de tus Sueños',
        ctaP:     'Cuéntanos tu idea y creamos una propuesta personalizada sin compromiso.',
        ctaBtn:   'Solicitar Cotización',
        ctaUrl:   '../contacto.html',

        complementa_label: 'También Te Puede Interesar',
        complementa_h2:    'Complementa tu Evento',
      },
    },

  }; // fin MIGRATIONS

  // ── Ejecutar migración ────────────────────────────────────────
  console.log('🚀 Iniciando migración de servicios...\n');

  const colRef = collection(db, 'services');
  const snap   = await getDocs(query(colRef, where('visible', '==', true)));

  let actualizados = 0;
  let noEncontrados = [];

  for (const [slug, data] of Object.entries(MIGRATIONS)) {
    // Buscar el documento por link o por ID
    const docMatch = snap.docs.find(d => {
      const link   = d.data().link || '';
      const docSlug = link.replace('servicios/', '').replace('.html', '');
      return docSlug === slug || d.id === slug;
    });

    if (!docMatch) {
      console.warn(`⚠️  No encontrado en Firestore: ${slug}`);
      noEncontrados.push(slug);
      continue;
    }

    try {
      await updateDoc(docMatch.ref, data);
      console.log(`✅ Actualizado: ${data.title}`);
      actualizados++;
    } catch (err) {
      console.error(`❌ Error en ${slug}:`, err);
    }
  }

  console.log('\n──────────────────────────────────────');
  console.log(`✅ Servicios actualizados: ${actualizados} / ${Object.keys(MIGRATIONS).length}`);

  if (noEncontrados.length > 0) {
    console.warn('\n⚠️  Estos slugs no fueron encontrados en la colección `services`:');
    console.warn(noEncontrados.join(', '));
    console.warn('\nVerifica que existan en Firebase con el campo `link` correcto.');
    console.warn('Ejemplo para Hora Loca: link = "servicios/hora-loca.html"');
  }

  console.log('\n🎉 Migración completada. Recarga localhost:3000 para ver los cambios.');
};

runMigration().catch(err => {
  console.error('❌ Error en la migración:', err);
  console.error('Asegúrate de estar en localhost:3001 con sesión iniciada.');
});
