// RUTA: apps/admin/src/app/dashboard/albumes/page.tsx
import { redirect } from 'next/navigation';

// La gestión de álbumes se movió dentro de /dashboard/galeria (pestaña "Álbumes").
// Esta ruta se conserva solo para no romper bookmarks/links viejos.
export default function AlbumesRedirectPage() {
    redirect('/dashboard/galeria');
}
