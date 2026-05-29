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
