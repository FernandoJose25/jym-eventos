// FAQ propio de cada servicio, indexado por el slug de la URL
// (/servicios/<slug>). Es el respaldo que se muestra mientras el servicio no
// tenga `detail.faq` cargado desde el panel admin: si el admin escribe FAQs,
// esas mandan y esto no se usa.
//
// Política comercial acordada con el cliente (2026-07-21) y repetida en las
// respuestas para que sea consistente en toda la web:
//   · Reserva recomendada: 3 semanas de anticipación.
//   · Adelanto: 50% para separar la fecha, saldo el día del evento.
//
// Al agregar un servicio nuevo en el admin, añade aquí su slug; si no está,
// cae al FAQ_GENERICO de abajo y la página igual funciona.

export interface FaqServicio { pregunta: string; respuesta: string }

const RESERVA_3_SEMANAS =
  'Lo ideal es reservar con al menos 3 semanas de anticipación. En temporada alta (julio a diciembre, quinceaños y promociones) las fechas se llenan rápido, así que conviene escribirnos apenas tengas la fecha definida.';

const ADELANTO_50 =
  'Sí. Con el 50% de adelanto separamos tu fecha en exclusiva y el saldo se cancela el día del evento. Así garantizamos que ese día nuestro equipo esté reservado solo para ti.';

const COBERTURA =
  'Atendemos Sechura, Piura y alrededores. Escríbenos por WhatsApp indicando tu distrito y te confirmamos la cobertura y si aplica algún costo de movilización.';

export const FAQ_GENERICO: FaqServicio[] = [
  { pregunta: '¿Con cuánta anticipación debo reservar?', respuesta: RESERVA_3_SEMANAS },
  { pregunta: '¿Piden adelanto para asegurar la fecha?', respuesta: ADELANTO_50 },
  { pregunta: '¿Puedo personalizar el paquete según mi presupuesto?', respuesta: 'Sí, armamos la propuesta a medida: puedes agregar o quitar elementos según lo que necesites y el presupuesto que manejas. Cuéntanos tu idea por WhatsApp y te cotizamos sin compromiso.' },
  { pregunta: '¿El precio incluye montaje y desmontaje?', respuesta: 'Sí, todo servicio incluye la instalación previa y el desmontaje al finalizar el evento, sin costo adicional. Tú solo disfrutas.' },
  { pregunta: '¿Tienen cobertura fuera de Sechura?', respuesta: COBERTURA },
];

export const FAQ_POR_SERVICIO: Record<string, FaqServicio[]> = {
  quinceanos: [
    { pregunta: '¿Con cuánta anticipación debo reservar los quince?', respuesta: 'Recomendamos 3 semanas como mínimo, pero para quinceaños lo ideal es 1 a 2 meses: es el evento que más planificación requiere (decoración, vals, protocolo) y las fechas de temporada alta se agotan primero.' },
    { pregunta: '¿Piden adelanto para asegurar la fecha?', respuesta: ADELANTO_50 },
    { pregunta: '¿Puedo elegir el tema y los colores de la decoración?', respuesta: 'Claro, ese es el corazón del servicio. Trabajamos con la quinceañera el tema, la paleta de colores y el estilo que quiere, y armamos la ambientación completa: entrada, mesa principal, backdrop de fotos y área de vals.' },
    { pregunta: '¿Se incluye el momento del vals y la entrada?', respuesta: 'Sí, coordinamos la ambientación e iluminación de los momentos protocolares: la entrada de la quinceañera, el vals con papá y la ceremonia de velas o zapatilla si la deseas. Nos alineamos con tu maestro de ceremonias.' },
    { pregunta: '¿Puedo combinar la decoración con show y cabina de fotos?', respuesta: 'Sí, y es lo más pedido: decoración + hora loca + cabina fotográfica con un solo equipo coordinando todo. Al armarlo junto te sale mejor que contratando cada servicio por separado.' },
    { pregunta: '¿Atienden quinceaños fuera de Sechura?', respuesta: COBERTURA },
  ],

  bodas: [
    { pregunta: '¿Con cuánta anticipación debo reservar mi boda?', respuesta: 'Para bodas recomendamos reservar con 1 a 2 meses de anticipación, y con 3 semanas como mínimo absoluto. Mientras antes reserves, más margen tenemos para conseguir exactamente la ambientación que sueñas.' },
    { pregunta: '¿Piden adelanto para asegurar la fecha?', respuesta: ADELANTO_50 },
    { pregunta: '¿Decoran tanto la ceremonia como la recepción?', respuesta: 'Sí, cubrimos ambos momentos: el camino al altar, el arco floral, la ambientación del salón, la mesa de novios, la iluminación y los centros de mesa. Podemos hacer solo uno de los dos si lo prefieres.' },
    { pregunta: '¿Puedo ver una propuesta antes de decidir?', respuesta: 'Sí. Conversamos tu estilo (clásico, bohemio, elegante moderno), la paleta y el espacio, y te presentamos una propuesta con referencias visuales antes de que confirmes nada. La cotización es gratuita.' },
    { pregunta: '¿Cuánto tiempo antes montan la decoración?', respuesta: 'Llegamos con varias horas de anticipación al local para montar con calma y hacer pruebas de iluminación. El desmontaje al terminar el evento también está incluido, sin costo extra.' },
    { pregunta: '¿Atienden bodas fuera de Sechura?', respuesta: COBERTURA },
  ],

  'bm-vogue': [
    { pregunta: '¿Cuánto tiempo dura el servicio de cabina fotográfica?', respuesta: 'El paquete estándar es de 2 a 3 horas de cabina activa con operador. Si tu evento es largo puedes ampliar las horas: solo dinos cuánto dura tu fiesta y lo ajustamos.' },
    { pregunta: '¿Las fotos se entregan impresas al momento?', respuesta: 'Sí, tus invitados se llevan su foto impresa en el instante, y además recibes todas las tomas en digital para compartirlas por WhatsApp o redes después del evento.' },
    { pregunta: '¿Incluye props y fondo personalizado?', respuesta: 'Sí, llevamos accesorios divertidos (sombreros, letreros, lentes) y podemos personalizar el fondo y el marco de la foto con los nombres, la fecha y el tema de tu evento.' },
    { pregunta: '¿Cuánto espacio necesitan para instalar la cabina?', respuesta: 'Necesitamos aproximadamente 2 x 2 metros y un punto de corriente cercano. Llegamos antes del evento para instalar y probar todo, y desmontamos al finalizar.' },
    { pregunta: '¿Con cuánta anticipación debo reservar?', respuesta: RESERVA_3_SEMANAS },
    { pregunta: '¿Piden adelanto para asegurar la fecha?', respuesta: ADELANTO_50 },
  ],

  'decoracion-tematica': [
    { pregunta: '¿Puedo pedir cualquier temática?', respuesta: 'Sí. Trabajamos temáticas infantiles (superhéroes, princesas, personajes de moda), elegantes para adultos y corporativas de marca. Mándanos una foto de referencia de lo que tienes en mente y lo recreamos a nuestro estilo.' },
    { pregunta: '¿Con cuánta anticipación debo reservar?', respuesta: RESERVA_3_SEMANAS + ' Si la temática requiere elementos mandados a hacer, avísanos apenas puedas.' },
    { pregunta: '¿Piden adelanto para asegurar la fecha?', respuesta: ADELANTO_50 },
    { pregunta: '¿Qué incluye la ambientación completa?', respuesta: 'Backdrop o pared temática, mesa principal decorada, globos, iluminación, elementos de utilería y detalles en las mesas de invitados. El alcance exacto lo definimos según el espacio y tu presupuesto.' },
    { pregunta: '¿Decoran en casas o solo en locales?', respuesta: 'En ambos. Decoramos casas, patios, salones de eventos y locales comerciales. Solo necesitamos conocer el espacio con anticipación para planificar el montaje.' },
    { pregunta: '¿Atienden fuera de Sechura?', respuesta: COBERTURA },
  ],

  'shows-infantiles': [
    { pregunta: '¿Qué personajes tienen disponibles?', respuesta: 'Contamos con superhéroes, princesas, personajes animados y mascotas gigantes. Dinos cuál es el favorito del cumpleañero y te confirmamos disponibilidad para tu fecha.' },
    { pregunta: '¿Cuánto dura el show?', respuesta: 'Los shows van de 1 a 2 horas según el paquete. Incluyen animación, juegos, concursos, globoflexia y pintacaritas, con el ritmo adaptado a la edad de los niños.' },
    { pregunta: '¿Para qué edades es apropiado?', respuesta: 'Adaptamos el show a la edad del grupo: para los más pequeños hacemos dinámicas suaves y personajes, y para niños de 7 años a más sumamos retos y concursos más movidos.' },
    { pregunta: '¿Llevan su propio equipo de sonido?', respuesta: 'Sí, llevamos parlantes, micrófono y toda la música. Solo necesitamos un punto de corriente en el lugar del evento.' },
    { pregunta: '¿Con cuánta anticipación debo reservar?', respuesta: RESERVA_3_SEMANAS },
    { pregunta: '¿Piden adelanto para asegurar la fecha?', respuesta: ADELANTO_50 },
  ],

  'hora-loca': [
    { pregunta: '¿En qué momento del evento conviene la hora loca?', respuesta: 'Normalmente después de la cena o del brindis, cuando la fiesta necesita un empujón de energía. Coordinamos el momento exacto contigo o con tu maestro de ceremonias.' },
    { pregunta: '¿Cuánto dura y qué incluye?', respuesta: 'Dura aproximadamente una hora e incluye animadores, música, accesorios locos (sombreros, lentes, antifaces), juegos grupales y lluvia de serpentinas: el momento más fotogénico de la noche.' },
    { pregunta: '¿Sirve para adultos o solo para niños?', respuesta: 'Funciona con todo público. Es de los servicios más pedidos en bodas, quinceaños, promociones y aniversarios de empresa, justamente porque integra a todos los invitados.' },
    { pregunta: '¿Cuántos animadores vienen?', respuesta: 'Depende del tamaño de tu evento: para grupos pequeños va un animador principal, y para fiestas grandes reforzamos el equipo para que la energía llegue a todas las mesas.' },
    { pregunta: '¿Con cuánta anticipación debo reservar?', respuesta: RESERVA_3_SEMANAS },
    { pregunta: '¿Piden adelanto para asegurar la fecha?', respuesta: ADELANTO_50 },
  ],

  'activaciones-empresariales': [
    { pregunta: '¿Qué tipo de eventos corporativos cubren?', respuesta: 'Activaciones de marca, aniversarios de empresa, fiestas de fin de año, inauguraciones, ferias y campañas navideñas. Nos adaptamos al objetivo comercial de la activación, no solo a la decoración.' },
    { pregunta: '¿Pueden usar la identidad visual de mi marca?', respuesta: 'Sí. Trabajamos con los colores, el logo y los lineamientos de tu marca en la ambientación, los backdrops y el material gráfico, para que todo se vea coherente en las fotos.' },
    { pregunta: '¿Emiten comprobante para la empresa?', respuesta: 'Sí, emitimos comprobante a nombre de la empresa. Coordinamos con tu área administrativa los datos de facturación y las condiciones de pago.' },
    { pregunta: '¿Con cuánta anticipación debo coordinar?', respuesta: 'Para activaciones corporativas recomendamos avisar con 3 semanas o más, ya que suelen requerir personalización de marca, permisos del local y coordinación con varias áreas.' },
    { pregunta: '¿Piden adelanto?', respuesta: ADELANTO_50 + ' Para empresas podemos ajustar las condiciones según tu proceso interno de pagos.' },
    { pregunta: '¿Atienden fuera de Sechura?', respuesta: COBERTURA },
  ],

  luminex: [
    { pregunta: '¿Qué incluye el estudio creativo audiovisual?', respuesta: 'Cobertura fotográfica y de video de tu evento con enfoque creativo: momentos clave, retratos de los protagonistas, tomas de ambiente y edición para que el resultado se vea profesional.' },
    { pregunta: '¿En cuánto tiempo entregan el material?', respuesta: 'Durante el evento entregamos material al instante para que puedas compartirlo el mismo día, y el trabajo final editado se entrega en digital pocos días después. El plazo exacto se define al cotizar.' },
    { pregunta: '¿Entregan las fotos en digital o impresas?', respuesta: 'Todo el material se entrega en digital, listo para compartir por WhatsApp o redes. Si quieres impresiones o un álbum físico, lo cotizamos aparte.' },
    { pregunta: '¿Puedo combinarlo con la cabina fotográfica?', respuesta: 'Sí, es una combinación muy pedida: la cobertura audiovisual registra el evento completo y la cabina se encarga de la diversión con los invitados. Al contratarlos juntos coordinamos un solo equipo.' },
    { pregunta: '¿Con cuánta anticipación debo reservar?', respuesta: RESERVA_3_SEMANAS },
    { pregunta: '¿Piden adelanto para asegurar la fecha?', respuesta: ADELANTO_50 },
  ],

  promociones: [
    { pregunta: '¿Qué incluye el servicio para fiestas de promoción?', respuesta: 'Ambientación completa del salón con la temática y los colores de la promoción, backdrop para fotos con el nombre del año, iluminación y los momentos protocolares del grupo.' },
    { pregunta: '¿Con cuánta anticipación debe reservar la promoción?', respuesta: 'Cuanto antes mejor: las promociones se concentran en los mismos meses del año y las fechas se agotan. Recomendamos coordinar con 1 a 2 meses, y 3 semanas como mínimo.' },
    { pregunta: '¿Cómo se maneja el pago si somos un grupo?', respuesta: 'Coordinamos con el comité o los delegados de la promoción: con el 50% de adelanto separamos la fecha y el saldo se cancela el día del evento. Emitimos el comprobante correspondiente.' },
    { pregunta: '¿Podemos personalizar con el nombre y el año de la promoción?', respuesta: 'Sí, es lo que más piden: letras corpóreas con el año, backdrop con el nombre de la promoción y detalles con los colores del colegio o instituto.' },
    { pregunta: '¿Pueden incluir hora loca y cabina de fotos?', respuesta: 'Sí, y es la combinación estrella para promociones: decoración + hora loca + cabina fotográfica. Armado en conjunto sale mejor que contratando cada servicio por separado.' },
    { pregunta: '¿Atienden promociones fuera de Sechura?', respuesta: COBERTURA },
  ],

  'catering-snacks': [
    { pregunta: '¿Qué carritos de snacks tienen disponibles?', respuesta: 'Contamos con opciones de dulces, snacks salados y bebidas para complementar tu celebración. Cuéntanos el tipo de evento y la cantidad de invitados y te decimos qué combinación funciona mejor.' },
    { pregunta: '¿Cómo calculan la cantidad para mis invitados?', respuesta: 'Calculamos las porciones según el número de asistentes y la duración del evento, para que no falte ni sobre. Solo necesitamos un estimado de invitados al cotizar.' },
    { pregunta: '¿Incluye personal para atender el carrito?', respuesta: 'Sí, el servicio incluye personal que atiende el carrito durante el evento, además del montaje previo y el desmontaje al finalizar.' },
    { pregunta: '¿Puedo combinarlo con la decoración del evento?', respuesta: 'Sí, y queda mejor: ambientamos el carrito con los mismos colores y la temática de tu decoración para que todo se vea como un solo conjunto.' },
    { pregunta: '¿Con cuánta anticipación debo reservar?', respuesta: RESERVA_3_SEMANAS },
    { pregunta: '¿Piden adelanto para asegurar la fecha?', respuesta: ADELANTO_50 },
  ],
};

/** FAQ a mostrar para un slug: el del admin manda; si no hay, el propio del
 *  servicio; si el slug es nuevo y no está mapeado, el genérico. */
export function getFaqServicio(slug: string, faqAdmin?: any[]): FaqServicio[] {
  if (faqAdmin && faqAdmin.length > 0) return faqAdmin as FaqServicio[];
  return FAQ_POR_SERVICIO[slug] ?? FAQ_GENERICO;
}
