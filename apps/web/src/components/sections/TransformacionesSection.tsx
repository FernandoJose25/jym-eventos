'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import DividerJM from '@/components/ui/DividerJM';

/* "Antes / Después": slider deslizable que revela la transformación de un local
   vacío a evento montado. Es la prueba visual más fuerte del oficio de J&M y
   contenido que la gente comparte. Se administra desde site_config/transformaciones
   (array de pares antes/después); si no hay ninguno, la sección no se renderiza. */

interface Par {
  antes: string;      // URL foto "antes" (local vacío)
  despues: string;    // URL foto "después" (evento montado)
  titulo?: string;    // ej. "Quinceaños Noche Azul · Salón El Paraíso"
}

function Comparador({ par }: { par: Par }) {
  const [pos, setPos] = useState(50); // % visible del "después"
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = (clientX: number) => {
    const box = boxRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    const p = ((clientX - r.left) / r.width) * 100;
    setPos(Math.max(3, Math.min(97, p)));
  };

  return (
    <div
      ref={boxRef}
      style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden',
        aspectRatio: '4 / 3', userSelect: 'none', cursor: 'ew-resize',
        boxShadow: '0 24px 60px rgba(10,22,40,0.35)',
        border: '1px solid rgba(212,160,23,0.2)', touchAction: 'pan-y',
      }}
      onMouseDown={e => { dragging.current = true; setFromClientX(e.clientX); }}
      onMouseMove={e => { if (dragging.current) setFromClientX(e.clientX); }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onTouchStart={e => setFromClientX(e.touches[0].clientX)}
      onTouchMove={e => setFromClientX(e.touches[0].clientX)}
    >
      {/* Después (fondo completo) */}
      <Image src={par.despues} alt={par.titulo ? `Después: ${par.titulo}` : 'Evento montado por J&M'}
        fill sizes="(max-width: 900px) 100vw, 900px" style={{ objectFit: 'cover' }} />
      <span style={{
        position: 'absolute', top: 12, right: 12, zIndex: 3,
        fontSize: '0.7rem', fontWeight: 800, color: '#0a1628',
        background: 'linear-gradient(135deg,#b8860b,#f5c842)',
        padding: '0.25em 0.75em', borderRadius: 9999,
      }}>✨ Después</span>

      {/* Antes (recortado a la izquierda del handle) */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, zIndex: 2,
        clipPath: `inset(0 ${100 - pos}% 0 0)`,
      }}>
        <Image src={par.antes} alt="" fill sizes="(max-width: 900px) 100vw, 900px" style={{ objectFit: 'cover' }} />
        <span style={{
          position: 'absolute', top: 12, left: 12,
          fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)',
          background: 'rgba(10,22,40,0.55)', backdropFilter: 'blur(4px)',
          padding: '0.25em 0.75em', borderRadius: 9999,
        }}>Antes</span>
      </div>

      {/* Handle */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, zIndex: 4,
        width: 2, background: '#f5c842', boxShadow: '0 0 14px rgba(245,200,66,0.7)',
        transform: 'translateX(-1px)', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 38, height: 38, borderRadius: '50%',
          background: 'linear-gradient(135deg,#b8860b,#f5c842)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#0a1628', fontSize: '1rem', fontWeight: 800,
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
        }}>⇄</div>
      </div>

      {par.titulo && (
        <p style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3, margin: 0,
          padding: '2rem 1rem 0.9rem', textAlign: 'center',
          color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem',
          background: 'linear-gradient(transparent, rgba(10,22,40,0.85))',
          pointerEvents: 'none',
        }}>{par.titulo}</p>
      )}
    </div>
  );
}

export default function TransformacionesSection({ data }: { data?: Record<string, any> | null }) {
  const pares: Par[] = (data?.pares || []).filter((p: any) => p?.antes && p?.despues);
  const [activo, setActivo] = useState(0);

  if (!pares.length) return null;

  const par = pares[Math.min(activo, pares.length - 1)];

  return (
    <section style={{ padding: '6rem 0', background: '#0a1628', position: 'relative', overflow: 'hidden' }}>
      <div className="container" style={{ maxWidth: 820 }}>
        <DividerJM tone="dark" />

        <div className="reveal" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: '1rem',
            padding: '0.4rem 1.5rem', borderRadius: 9999,
            background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.25)',
            color: '#f5c842', fontSize: '0.75rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.12em',
          }}>
            🪄 {data?.eyebrow || 'La transformación J&M'}
          </span>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem,3.5vw,2.6rem)' }}>
            {data?.titulo || 'De local vacío a'}{' '}
            <em style={{ color: '#f5c842', fontStyle: 'italic' }}>{data?.tituloAccent || 'mundo mágico'}</em>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', maxWidth: 460, margin: '0.9rem auto 0' }}>
            Desliza para ver el antes y el después de nuestros eventos.
          </p>
        </div>

        <div className="reveal">
          <Comparador key={activo} par={par} />
        </div>

        {/* Selector de transformación (si hay más de una) */}
        {pares.length > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
            {pares.map((_, i) => (
              <button key={i} onClick={() => setActivo(i)}
                aria-label={`Ver transformación ${i + 1}`}
                style={{
                  width: i === activo ? 26 : 9, height: 9, borderRadius: 9999, border: 'none', cursor: 'pointer',
                  background: i === activo ? 'linear-gradient(90deg,#b8860b,#f5c842)' : 'rgba(255,255,255,0.2)',
                  transition: 'all .4s cubic-bezier(.16,1,.3,1)', padding: 0,
                }} />
            ))}
          </div>
        )}

        <div className="reveal" style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <a href="https://wa.me/51945203708?text=Hola%2C%20quiero%20una%20transformaci%C3%B3n%20as%C3%AD%20para%20mi%20evento"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.9rem 2rem',
              borderRadius: 9999, background: 'linear-gradient(135deg,#b8860b,#f5c842)',
              color: '#0a1628', fontWeight: 700, fontSize: '0.92rem', textDecoration: 'none',
              boxShadow: '0 6px 22px rgba(212,160,23,0.35)',
              transition: 'transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s',
            }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 14px 36px rgba(212,160,23,0.5)'; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.transform = ''; el.style.boxShadow = '0 6px 22px rgba(212,160,23,0.35)'; }}>
            💬 Quiero una transformación así
          </a>
        </div>
      </div>
    </section>
  );
}
