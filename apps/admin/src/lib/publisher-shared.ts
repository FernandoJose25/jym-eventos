/**
 * Tipos y utilidades de CASTREAM sin dependencias de servidor: los usan
 * tanto las rutas API como páginas cliente del panel (ej. Versiones).
 */

export const CANALES = ['android-sideload', 'android-play', 'windows'] as const;
export type Canal = (typeof CANALES)[number];
export const esCanal = (v: unknown): v is Canal => CANALES.includes(v as Canal);

/** Fila de app_config (Supabase): lo que la app consulta para decidir si muestra el modal de actualización. */
export interface AppVersionConfig {
  channel: Canal;
  latest_version: string;
  min_version: string;
  changelog: string[];
  download_url: string;
  force_update: boolean;
  published_at: string;
}

export const esVersion = (v: unknown): v is string => typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v);

/** -1 si a < b, 0 si son iguales, 1 si a > b (MAJOR.MINOR.PATCH). */
export function compararVersiones(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}
