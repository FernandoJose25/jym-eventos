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