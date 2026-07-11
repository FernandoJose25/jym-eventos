/**
 * Taxonomía única de categorías/subcategorías de la galería.
 * MISMA fuente que usa /dashboard/galeria (antes duplicada ahí como SUBCATS).
 * Se usa tanto en el panel admin como en la clasificación automática con IA,
 * para que la IA nunca pueda inventar una categoría que no existe en la web.
 */
export const SUBCATS: Record<string, string[]> = {
    'General': [],
    'Shows Infantiles': ['Mickey Mouse', 'Pocoyo', 'Frozen', 'Encanto', 'Spider-Man', 'Princesas', 'Minnie Mouse', 'Baby Shark', 'Paw Patrol', 'Otro'],
    'Show Hora Loca': ['Cumpleaños', 'Boda', 'Quinceañero', 'Corporativo', 'Bautizo', 'Otro'],
    'Activaciones Empresariales': ['Lanzamiento', 'Team Building', 'Feria', 'Corporativo', 'Otro'],
    'Decoración Temática': ['Princesas', 'Superhéroes', 'Tropical', 'Boho/Rústico', 'Elegante', 'Personalizada', 'Otro'],
    'Fotografía': ['Show Infantil', 'Hora Loca', 'Corporativo', 'Decoración', 'General'],
    'Filmación y Fotografía': ['Show Infantil', 'Hora Loca', 'Corporativo', 'Decoración', 'General'],
    'Catering': ['Carrito Snacks', 'Mesa Dulces', 'Candy Bar', 'Catering General'],
    'Catering y Carritos Snacks': ['Carrito Snacks', 'Mesa Dulces', 'Candy Bar', 'Catering General'],
};

export const CATEGORIAS = Object.keys(SUBCATS);

/** Descripción breve de cada categoría, usada en el prompt de clasificación con IA. */
export const CATEGORIA_DESCRIPCIONES: Record<string, string> = {
    'General': 'Fotos que no encajan claramente en ninguna otra categoría.',
    'Shows Infantiles': 'Animación para niños con personajes o mascotas disfrazadas.',
    'Show Hora Loca': 'Animación con humo, luces de colores, máscaras o percusión para adultos.',
    'Activaciones Empresariales': 'Eventos corporativos, stands de marca, ferias o lanzamientos.',
    'Decoración Temática': 'Escenografía, backdrop o centros de mesa, sin gente en primer plano.',
    'Fotografía': 'Retratos o tomas fotográficas posadas, sin equipo de filmación visible.',
    'Filmación y Fotografía': 'Producción con cámara de cine, drone/dron, gimbal o luces de video.',
    'Catering': 'Comida servida, buffet o mesa de platos.',
    'Catering y Carritos Snacks': 'Carrito de dulces/snacks o candy bar.',
};