import {
  PartyPopper, Building2, UtensilsCrossed, Tag, Palette, Drama,
  Crown, Camera, Video, Heart, Sparkles, Music, Gift, Star,
  type LucideIcon,
} from 'lucide-react';

/**
 * Iconos SVG por clave, elegidos desde el panel admin (IconPicker).
 * Los servicios antiguos que aún guardan un emoji en `icon` siguen
 * mostrando ese emoji tal cual — ver `renderServiceIcon` más abajo.
 */
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  party: PartyPopper,
  building: Building2,
  catering: UtensilsCrossed,
  tag: Tag,
  palette: Palette,
  drama: Drama,
  crown: Crown,
  camera: Camera,
  video: Video,
  heart: Heart,
  sparkles: Sparkles,
  music: Music,
  gift: Gift,
  star: Star,
};

export const SERVICE_ICON_KEYS = Object.keys(SERVICE_ICONS);

/** true si `value` es una clave conocida de icono (no un emoji libre) */
export function isIconKey(value: string | undefined): value is keyof typeof SERVICE_ICONS {
  return !!value && value in SERVICE_ICONS;
}
