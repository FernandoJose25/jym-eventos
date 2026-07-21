/* Divisor ornamental con el monograma J&M — estilo invitación de lujo.
   `tone` elige colores legibles sobre fondo oscuro (navy) o claro (blanco/gris). */
export default function DividerJM({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const line = tone === 'dark' ? 'rgba(212,160,23,0.35)' : 'rgba(184,134,11,0.4)';
  const text = tone === 'dark' ? '#f5c842' : '#b8860b';
  return (
    <div aria-hidden="true" style={{
      display: 'flex', alignItems: 'center', gap: '1.1rem',
      maxWidth: 420, margin: '0 auto 3rem', padding: '0 1.5rem',
    }}>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${line})` }} />
      <span style={{
        fontFamily: 'var(--font-playfair)', fontStyle: 'italic',
        color: text, fontSize: '1rem', letterSpacing: '.08em', lineHeight: 1,
      }}>J&amp;M</span>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${line},transparent)` }} />
    </div>
  );
}
