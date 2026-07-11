export interface Servicio {
  id?: string; slug: string; tituloCorto: string; icono: string; orden: number; activo: boolean;
  efectos?: { globos:boolean; confeti:boolean; particulas:boolean; flotantes:boolean };
  hero?: { eyebrow:string; h1:string; descripcion:string; imagen:string; focalX:number; focalY:number; spline3dUrl?:string };
  detalle?: { label:string; h2:string; parrafo1:string; parrafo2?:string; imagen:string; focalX:number; focalY:number; imagenLado:'izquierda'|'derecha'; caracteristicas:{texto:string;detalle:string}[]; btnPrimario:{texto:string;url:string}; btnWhatsApp:{texto:string;url:string} };
  queIncluye?: { label:string; h2:string; cards:{icono:string;titulo:string;descripcion:string}[] };
  galeria?: { label:string; h2:string; items:{url:string;alt:string;focalX:number;focalY:number}[] };
  video?: { youtubeId:string; titulo:string; descripcion?:string };
  relacionados?: string[]; cta?: { h2:string; descripcion:string; btnTexto:string; btnUrl:string };
  seo?: { titulo:string; descripcion:string; ogImagen?:string };
}

// ── Álbumes de eventos reales ──────────────────────────────────
// Un álbum representa un evento concreto (cumpleaños, quinceañero, activación
// corporativa, etc). Sus fotos/videos viven en `gallery_items` como siempre —
// simplemente se les asigna `albumId` (nuevo campo opcional) para agruparlas.
export interface Album {
  id: string;
  slug: string;
  titulo: string;
  tipoEvento?: string;   // "Cumpleaños", "Quinceañero", "Corporativo", "Baby Shower"...
  cliente?: string;
  fecha: string;         // ISO date string ('YYYY-MM-DD')
  descripcion?: string;
  coverUrl: string;
  coverFocalX?: number;
  coverFocalY?: number;
  visible: boolean;
  order: number;
}

export interface AlbumFoto {
  id: string;
  url: string;
  alt?: string;
  tipo?: string;         // 'foto' | 'video'
  focalX?: number;
  focalY?: number;
  order?: number;
  // Solo aplica a videos: si no es exactamente `true`, el reproductor los
  // fuerza muteados y el visitante no puede activar el sonido.
  sonidoPermitido?: boolean;
}
