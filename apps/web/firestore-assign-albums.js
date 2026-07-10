/**
 * ================================================================
 *  firestore-assign-albums.js
 *  Ejecutar en la CONSOLA DEL NAVEGADOR mientras estás en el admin
 *  (localhost:3001 o tu dominio de admin en producción) logueado.
 *
 *  Sirve para agrupar en álbum varios items de `gallery_items` que
 *  YA EXISTEN, en un solo paso, sin editarlos uno por uno desde el
 *  formulario. Útil para tus 19 fotos/videos actuales.
 * ================================================================
 *
 *  CÓMO USAR:
 *  1. Abre el admin panel en el navegador, en /dashboard/galeria
 *  2. Inicia sesión
 *  3. Copia el `id` de cada foto/video que pertenece al mismo evento
 *     (puedes verlo abriendo el item a editar, o inspeccionando el
 *     documento en la consola de Firebase)
 *  4. Edita el array ASSIGNMENTS más abajo con tus datos reales
 *  5. Presiona F12 → pestaña "Console", pega este script, Enter
 */

const ASSIGNMENTS = [
    {
        albumTitle: 'Quinceañero de Sofía',
        albumSubtitle: 'Temática Bella y Bestia',
        itemIds: [
            // 'REEMPLAZA_CON_ID_REAL_1',
            // 'REEMPLAZA_CON_ID_REAL_2',
        ],
    },
    // Agrega más bloques { albumTitle, albumSubtitle, itemIds } según necesites
];

function slugifyAlbum(title) {
    return title
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

const run = async () => {
    const { doc, updateDoc, getFirestore } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js');
    const firestore = getFirestore();

    for (const group of ASSIGNMENTS) {
        if (!group.itemIds.length) {
            console.warn(`⚠️  "${group.albumTitle}" no tiene itemIds, se omite`);
            continue;
        }
        const albumId = slugifyAlbum(group.albumTitle);
        for (const id of group.itemIds) {
            await updateDoc(doc(firestore, 'gallery_items', id), {
                albumId,
                albumTitle: group.albumTitle,
                albumSubtitle: group.albumSubtitle || '',
            });
            console.log(`✅ ${id} → álbum "${group.albumTitle}"`);
        }
    }

    console.log('');
    console.log('🎉 Álbumes asignados. Recarga /galeria para verlos agrupados.');
};

run().catch(console.error);
