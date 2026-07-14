'use client';
import { SERVICE_ICONS, SERVICE_ICON_KEYS, SERVICE_ICON_LABELS, isIconKey } from '@/lib/serviceIcons';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/**
 * Selector visual de íconos SVG dorados para servicios. Guarda una clave
 * (ej. "party") en vez de un emoji libre, para que la web pública renderice
 * un ícono SVG consistente en vez de un emoji cuyo estilo cambia por SO.
 * Si el servicio ya tenía un emoji guardado (dato antiguo), se muestra un
 * campo de texto de respaldo debajo para no perder esa edición existente.
 */
export default function IconPicker({ value, onChange }: Props) {
  const usesLegacyEmoji = !!value && !isIconKey(value);

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 6,
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 8,
        maxHeight: 216, overflowY: 'auto',
      }}>
        {SERVICE_ICON_KEYS.map(key => {
          const Icon = SERVICE_ICONS[key];
          const active = value === key;
          return (
            <button key={key} type="button" title={SERVICE_ICON_LABELS[key]}
              onClick={() => onChange(key)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', maxWidth: 48, aspectRatio: '1', borderRadius: 8, cursor: 'pointer',
                background: active ? 'linear-gradient(135deg,#b8860b,#f5c842)' : '#fff',
                border: active ? '1px solid #d4a017' : '1px solid #e2e8f0',
                color: active ? '#0a1628' : '#475569',
                transition: 'all .15s',
              }}
            >
              <Icon size={17} strokeWidth={2} />
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: '6px 0 0' }}>
        {SERVICE_ICON_KEYS.length} íconos disponibles — pasa el cursor sobre uno para ver su nombre.
      </p>

      {usesLegacyEmoji && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
            Emoji actual (formato antiguo — elige un ícono arriba para reemplazarlo)
          </label>
          <input type="text" value={value} onChange={e => onChange(e.target.value)}
            className="admin-input" style={{ textAlign: 'center', fontSize: '1.3rem', padding: '0.4rem' }} />
        </div>
      )}
    </div>
  );
}
