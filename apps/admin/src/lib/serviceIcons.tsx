import {
  PartyPopper, Building2, UtensilsCrossed, Tag, Palette, Drama,
  Crown, Camera, Video, Heart, Sparkles, Music, Gift, Star,
  type LucideIcon,
} from 'lucide-react';

/**
 * Debe mantenerse en espejo con apps/web/src/lib/serviceIcons.tsx —
 * la clave elegida aquí es la que renderiza el ícono SVG en la web pública.
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

export const SERVICE_ICON_LABELS: Record<string, string> = {
  party: 'Fiesta',
  building: 'Empresarial',
  catering: 'Catering',
  tag: 'Promoción',
  palette: 'Decoración',
  drama: 'Show',
  crown: 'Quinceaños',
  camera: 'Fotografía',
  video: 'Filmación',
  heart: 'Bodas',
  sparkles: 'Mágico',
  music: 'Música',
  gift: 'Regalo',
  star: 'Destacado',
};

export const SERVICE_ICON_KEYS = Object.keys(SERVICE_ICONS);

export function isIconKey(value: string | undefined): value is keyof typeof SERVICE_ICONS {
  return !!value && value in SERVICE_ICONS;
}
