/**
 * ================================================================
 *  firestore-seed.js
 *  Ejecutar en la CONSOLA DEL NAVEGADOR mientras estás en
 *  localhost:3001 (admin panel) logueado.
 *
 *  Esto crea los documentos base que el V2 necesita leer.
 *  Los datos del sitio anterior quedan intactos — esto solo AGREGA
 *  los documentos que el nuevo código espera.
 * ================================================================
 *
 *  CÓMO USAR:
 *  1. Abre localhost:3001 en el navegador
 *  2. Inicia sesión
 *  3. Presiona F12 → pestaña "Console"
 *  4. Pega todo este código y presiona Enter
 */

// Detectar si Firebase ya está inicializado en la página
const db = window.__firebase_db || (() => {
  console.error('Ejecuta esto desde localhost:3001 con sesión iniciada');
})();

const seed = async () => {
  const { doc, setDoc, getFirestore } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js');

  // Usar la instancia de Firebase que ya cargó el admin
  const firestore = getFirestore();

  // configuracion/hero
  await setDoc(doc(firestore, 'configuracion', 'hero'), {
    eyebrow: 'Organizamos tu momento especial',
    h1: 'Eventos que dejan <em>huella</em>',
    descripcion: 'Más de 8 años creando celebraciones únicas en Sechura, Piura. Shows infantiles, decoración temática, fotografía y mucho más.',
    btnPrimarioTexto: 'Ver Servicios',
    btnPrimarioUrl: '/#servicios',
    btnSecundarioTexto: 'Cotizar por WhatsApp',
    btnSecundarioUrl: 'https://wa.me/51945203708',
  }, { merge: true });
  console.log('✅ Hero creado');

  // configuracion/estadisticas
  await setDoc(doc(firestore, 'configuracion', 'estadisticas'), {
    items: [
      { numero: '+500', etiqueta: 'Eventos realizados', sublabel: 'Celebraciones exitosas' },
      { numero: '8+', etiqueta: 'Años de experiencia', sublabel: 'En Sechura y alrededores' },
      { numero: '98%', etiqueta: 'Clientes satisfechos', sublabel: 'Lo dicen ellos' },
      { numero: '+50', etiqueta: 'Tipos de eventos', sublabel: 'Bautizos, bodas y más' },
    ]
  }, { merge: true });
  console.log('✅ Estadísticas creadas');

  // configuracion/quienes-somos
  await setDoc(doc(firestore, 'configuracion', 'quienes-somos'), {
    titulo: 'Sobre J&M Decoraciones y Eventos',
    parrafo1: 'Somos una empresa familiar con más de 8 años de experiencia en la organización y decoración de eventos en Sechura, Piura.',
    parrafo2: 'Nuestro equipo de profesionales se encarga de cada detalle para que tu celebración sea perfecta, única e inolvidable.',
    parrafo3: 'Cada evento es una oportunidad para crear recuerdos que duren toda la vida. Ponemos el corazón en cada decoración.',
  }, { merge: true });
  console.log('✅ Quiénes somos creado');

  // configuracion/contacto
  await setDoc(doc(firestore, 'configuracion', 'contacto'), {
    telefono: '+51 945 203 708',
    whatsapp: '51945203708',
    email: 'jmdecoracionesyeventossechura@gmail.com',
    direccion: 'Sechura, Piura, Perú',
    horario: 'Lunes a Domingo — 9:00 AM a 8:00 PM',
    instagram: 'https://www.instagram.com/jmdecoracionesyeventos1/',
    facebook: 'https://www.facebook.com/JM.EventosyDecoraciones',
    tiktok: 'https://www.tiktok.com/@jmdecoraciones.18',
    mapsLat: -5.5566,
    mapsLng: -80.8234,
  }, { merge: true });
  console.log('✅ Contacto creado');

  // configuracion/navbar
  await setDoc(doc(firestore, 'configuracion', 'navbar'), {
    nombre: 'J&M Decoraciones y Eventos',
    tagline: 'Sechura - Piura',
  }, { merge: true });
  console.log('✅ Navbar creado');

  // 6 servicios
  const servicios = [
    { slug: 'shows-infantiles', tituloCorto: 'Shows Infantiles', icono: '🎭', orden: 1 },
    { slug: 'hora-loca', tituloCorto: 'Show Hora Loca', icono: '🎉', orden: 2 },
    { slug: 'activaciones-empresariales', tituloCorto: 'Activaciones Empresariales', icono: '🏢', orden: 3 },
    { slug: 'catering-snacks', tituloCorto: 'Catering y Snacks', icono: '🍽️', orden: 4 },
    { slug: 'filmacion-fotografia', tituloCorto: 'Filmación y Fotografía', icono: '📸', orden: 5 },
    { slug: 'decoracion-tematica', tituloCorto: 'Decoración Temática', icono: '🎨', orden: 6 },
  ];

  for (const s of servicios) {
    await setDoc(doc(firestore, 'servicios', s.slug), {
      ...s,
      activo: true,
      efectos: { globos: false, confeti: false, particulas: false, flotantes: false },
      hero: {
        eyebrow: s.tituloCorto,
        h1: `<em>${s.tituloCorto}</em> en Sechura`,
        descripcion: 'Servicio profesional con años de experiencia en Sechura, Piura.',
        imagen: '', focalX: 0.5, focalY: 0.4,
      },
      seo: {
        titulo: `${s.tituloCorto} en Sechura | J&M Decoraciones y Eventos`,
        descripcion: `${s.tituloCorto} profesionales en Sechura, Piura. Contáctanos sin compromiso.`,
      },
    }, { merge: true });
    console.log(`✅ Servicio creado: ${s.tituloCorto}`);
  }

  console.log('');
  console.log('🎉 ¡Todos los datos base creados en Firestore!');
  console.log('Recarga localhost:3000 para ver los cambios.');
};

seed().catch(console.error);