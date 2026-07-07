import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function formatRelative(dateStr: string): string {
  if (!dateStr) return '';
  const date  = new Date(dateStr);
  const now   = new Date();
  const diffMs= now.getTime() - date.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffM < 1)  return 'ahora';
  if (diffM < 60) return `${diffM}m`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 7)  return `${diffD}d`;
  return date.toLocaleDateString('es-PE', { day:'2-digit', month:'short' });
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  });
}

export function buildWhatsAppUrl(phone: string, name: string, eventType?: string): string {
  const p = (phone || '').replace(/\D/g,'');
  const num = p.startsWith('51') ? p : `51${p}`;
  const msg = `Hola ${name}, recibí tu consulta sobre ${eventType||'tu evento'} en J&M Decoraciones y Eventos. ¿Cómo te puedo ayudar?`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

export function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const keys    = Object.keys(data[0]).filter(k => k !== 'id');
  const header  = keys.join(',');
  const rows    = data.map(row =>
    keys.map(k => {
      const v = row[k] ?? '';
      return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
    }).join(',')
  );
  const csv  = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
