// Tipos que reflejan la estructura REAL de Firestore

export interface Servicio {
  id?:        string;
  title:      string;   // campo real
  icon:       string;   // campo real
  desc:       string;   // campo real
  link:       string;   // campo real (ej: "servicios/shows-infantiles.html")
  order:      number;   // campo real
  visible:    boolean;  // campo real
  mediaSrc?:  string;
  mediaType?: string;
}

export interface GaleriaItem {
  id?:       string;
  url:       string;
  alt:       string;
  visible:   boolean;  // campo real
  order:     number;   // campo real
  row:       number;
  focalX?:   number;
  focalY?:   number;
  categoria?:string;
  createdAt?:string;
}

export interface Testimonio {
  id?:     string;
  name:    string;   // campo real
  role:    string;   // campo real
  text:    string;   // campo real
  stars:   number;   // campo real
  avatar?: string;   // campo real
  visible: boolean;  // campo real
  order:   number;   // campo real
  focalX?: number;
  focalY?: number;
}

export type EstadoMensaje = 'pendiente' | 'en-revision' | 'cotizado' | 'cerrado';

export interface Mensaje {
  id?:          string;
  nombre:       string;
  telefono:     string;
  correo:       string;
  distrito?:    string;
  tipoEvento?:  string;
  fechaEvento?: string;
  invitados?:   string;
  presupuesto?: string;
  mensaje?:     string;
  fechaEnvio:   string;
  estado:       EstadoMensaje;
  leido:        boolean;
  origen?:      string;
}

// ── Cámara Invitado ─────────────────────────────────────────────
// Un "link" de cámara invitado conecta un QR físico (impreso en las mesas)
// con un álbum de `albums`. El token es lo único que aparece en la URL
// pública (/c/{token}); el albumId nunca se expone al invitado.
export interface CamaraInvitadoLink {
  id?:               string;
  albumId:           string;
  albumTitulo?:      string;  // desnormalizado para no hacer join al listar
  token:             string;
  activo:            boolean;
  plantillaUrl?:     string | null;
  plantillaActiva:   boolean;
  permiteVideo:      boolean;
  videoMaxSegundos:  number;
  createdAt:         string;
}

export type RolUsuario = 'admin' | 'editor' | 'lector';

export interface Usuario {
  uid:      string;
  email:    string;
  nombre:   string;
  rol:      RolUsuario;
  activo:   boolean;
  creadoEn: string;
}

export interface EstilosConfig {
  colors: {
    primary:       string;
    primaryLight:  string;
    primaryDark:   string;
    secondary:     string;
    secondaryLight:string;
    secondaryDark: string;
    dark:          string;
    light:         string;
    text:          string;
    surface:       string;
    border:        string;
  };
  typography: {
    fontDisplay:      string;
    fontBody:         string;
    sizeH1:           string;
    sizeH2:           string;
    sizeBody:         string;
    lineHeightBody:   string;
    trackingDisplay:  string;
  };
  buttons: {
    primary:   { bg:string; bgHover:string; text:string; radius:string; border:string };
    secondary: { bg:string; bgHover:string; text:string; radius:string; border:string };
  };
  sections: {
    heroGradient: string;
    altBg:        string;
    cardBg:       string;
  };
}

export const DEFAULT_ESTILOS: EstilosConfig = {
  colors: {
    primary:       '#1e3a5f',
    primaryLight:  '#2563eb',
    primaryDark:   '#0f2240',
    secondary:     '#d4a017',
    secondaryLight:'#f5c842',
    secondaryDark: '#b8860b',
    dark:          '#0a1628',
    light:         '#f0f4f8',
    text:          '#1a2332',
    surface:       '#ffffff',
    border:        '#e2e8f0',
  },
  typography: {
    fontDisplay:     'Playfair Display',
    fontBody:        'Plus Jakarta Sans',
    sizeH1:          'clamp(2.5rem,5vw,4rem)',
    sizeH2:          'clamp(1.75rem,3vw,2.75rem)',
    sizeBody:        '1rem',
    lineHeightBody:  '1.7',
    trackingDisplay: '-0.02em',
  },
  buttons: {
    primary:   { bg:'linear-gradient(135deg,#1e3a5f,#2563eb)', bgHover:'#1e40af', text:'#fff',    radius:'9999px', border:'none' },
    secondary: { bg:'transparent',                              bgHover:'#f5c842', text:'#d4a017', radius:'9999px', border:'2px solid #d4a017' },
  },
  sections: {
    heroGradient: 'linear-gradient(135deg,#050d1a 0%,#0a1628 40%,#1e3a5f 100%)',
    altBg:        '#f0f4f8',
    cardBg:       '#ffffff',
  },
};
