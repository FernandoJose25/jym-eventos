'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

type Stage = 'form' | 'loading' | 'success';

/* Mensajes según franja horaria — siempre hay algo relevante que decir,
   sin importar a qué hora o qué día entre el equipo. */
const FRANJAS = [
  { hasta: 5,  saludo: 'Buona notte',    msg: 'La ciudad duerme, pero las reservas de mañana no esperan.' },
  { hasta: 12, saludo: 'Buenos días',    msg: 'Nuevo día, nuevas fiestas por planear. Vamos con todo.' },
  { hasta: 18, saludo: 'Buenas tardes',  msg: 'El ritmo del día sigue. Revisa qué eventos necesitan tu toque.' },
  { hasta: 21, saludo: 'Buenas noches',  msg: 'El día casi termina, pero siempre hay un detalle más por afinar.' },
  { hasta: 24, saludo: 'Buenas noches',  msg: 'Trabajo nocturno también cuenta. Gracias por el compromiso.' },
];

const DIAS_ESPECIALES: Record<number, string> = {
  0: 'Los domingos también se organizan grandes celebraciones.',
  5: 'Viernes: la temporada alta de reservas empieza justo hoy.',
  6: 'Fin de semana — la temporada más movida del año.',
};

function useGreeting() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    if (!now) return { saludo: 'Bienvenido', msg: 'Inicia sesión para gestionar tus eventos.', hora: '' };
    const h = now.getHours();
    const franja = FRANJAS.find(f => h < f.hasta) || FRANJAS[FRANJAS.length - 1];
    const msgDia = DIAS_ESPECIALES[now.getDay()];
    const hora = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const fecha = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    return { saludo: franja.saludo, msg: msgDia || franja.msg, hora, fecha };
  }, [now]);
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();
  const [stage, setStage] = useState<Stage>('form');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const { saludo, msg, hora, fecha } = useGreeting();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pass) { setError('Completa todos los campos'); return; }
    setError(''); setStage('loading');
    try {
      await signIn(email, pass);
      setStage('success');
      setTimeout(() => router.push('/dashboard'), 900);
    } catch {
      setStage('form');
      setError('Correo o contraseña incorrectos');
    }
  };

  if (loading) return null;

  return (
    <div className="jym-shell" style={{ minHeight: '100vh', display: 'flex', background: '#050d1a', fontFamily: 'var(--font-jakarta)' }}>

      {/* ═══ Header de marca compacto (solo mobile) ═══ */}
      <div className="jym-mobile-brand jym-fade-in">
        <div style={{
          width: 36, height: 36, borderRadius: 11, flexShrink: 0,
          background: 'linear-gradient(135deg,#b8860b,#f5c842)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem',
          boxShadow: '0 6px 18px rgba(212,160,23,0.4)',
        }}>🎉</div>
        <div>
          <p style={{ color: '#fff', fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.15, margin: 0, letterSpacing: '-.01em' }}>
            J&amp;M Decoraciones y Eventos
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', margin: '2px 0 0', letterSpacing: '.08em', textTransform: 'uppercase' }}>Panel Administrativo</p>
        </div>
      </div>

      {/* ═══ Panel de marca (izquierda) ═══ */}
      <div style={{
        flex: '1 1 50%', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: 'clamp(2rem,4vw,4rem)',
        background: 'linear-gradient(160deg,#050d1a 0%,#0a1628 45%,#1e3a5f 100%)',
      }} className="jym-brand-panel">
        {/* Textura de fondo: puntos dorados sutiles + glow */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.5,
          backgroundImage: 'radial-gradient(#f5c84222 1px, transparent 1px)',
          backgroundSize: '28px 28px', animation: 'jym-grid-pan 40s linear infinite',
        }} />
        <div style={{
          position: 'absolute', top: '-10%', right: '-10%', width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,200,66,0.16) 0%, transparent 70%)', filter: 'blur(20px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-10%', width: 420, height: 420, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)', filter: 'blur(20px)',
        }} />

        {/* Logo + marca */}
        <div className="jym-fade-in" style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg,#b8860b,#f5c842)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
            boxShadow: '0 8px 24px rgba(212,160,23,0.4)',
          }}>🎉</div>
          <div>
            <p style={{ color: '#fff', fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: '1.15rem', lineHeight: 1.15, margin: 0, letterSpacing: '-.01em' }}>
              J&amp;M Decoraciones<br />y Eventos
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '2px 0 0', letterSpacing: '.08em', textTransform: 'uppercase' }}>Panel Administrativo</p>
          </div>
        </div>

        {/* Saludo dinámico */}
        <div style={{ position: 'relative', zIndex: 2 }} key={saludo}>
          {fecha && (
            <p className="jym-fade-in jym-delay-1" style={{
              color: '#f5c842', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.2em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f5c842', boxShadow: '0 0 8px #f5c842', display: 'inline-block' }} />
              {fecha} · {hora}
            </p>
          )}
          <h1 className="jym-fade-in jym-delay-2" style={{
            fontFamily: 'var(--font-playfair)', color: '#fff', fontWeight: 700,
            fontSize: 'clamp(2rem,3.6vw,3rem)', lineHeight: 1.08, margin: '0 0 1rem', letterSpacing: '-.02em',
          }}>
            {saludo},<br />equipo J&amp;M.
          </h1>
          <p className="jym-fade-in jym-delay-3" style={{
            color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 420, margin: 0,
          }}>
            {msg}
          </p>
        </div>

        <p className="jym-fade-in jym-delay-3" style={{ position: 'relative', zIndex: 2, color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', margin: 0 }}>
          Sechura, Piura · Desde 2014
        </p>
      </div>

      {/* ═══ Panel de formulario (derecha) ═══ */}
      <div style={{
        flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', background: '#0c1420',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {stage === 'success' ? (
            <div className="jym-modal-in" style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 1.25rem',
                background: 'linear-gradient(135deg,#10b981,#059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 28px rgba(16,185,129,0.4)',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" className="jym-check-draw" />
                </svg>
              </div>
              <p style={{ color: '#fff', fontFamily: 'var(--font-playfair)', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.4rem' }}>
                Acceso concedido
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0 }}>
                Redirigiendo al panel...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="jym-modal-in">
              <p style={{ color: '#f5c842', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.2em', margin: '0 0 0.6rem' }}>
                Iniciar sesión
              </p>
              <h2 style={{ fontFamily: 'var(--font-playfair)', color: '#fff', fontSize: '1.7rem', fontWeight: 700, margin: '0 0 2rem', letterSpacing: '-.01em' }}>
                Ingresa a tu cuenta
              </h2>

              <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, marginBottom: 6 }}>
                Correo electrónico
              </label>
              <div className="jym-field" style={{ marginBottom: '1.1rem' }}>
                <Mail size={16} className="jym-field-icon" />
                <input
                  autoComplete="email"
                  placeholder="tucorreo@jymeventos.com"
                  className="jym-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, marginBottom: 6 }}>
                Contraseña
              </label>
              <div className="jym-field" style={{ marginBottom: error ? '0.9rem' : '1.6rem' }}>
                <Lock size={16} className="jym-field-icon" />
                <input
                  placeholder="••••••••"
                  className="jym-input"
                  type={showPass ? 'text' : 'password'}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', padding: 4 }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <div className="jym-fade-in" style={{
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 10, padding: '0.65rem 0.9rem', color: '#fca5a5', fontSize: '0.8rem',
                  marginBottom: '1.6rem',
                }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={stage === 'loading'} className="jym-submit">
                {stage === 'loading'
                  ? <Loader2 size={16} className="jym-spin" />
                  : <>Ingresar al panel <ArrowRight size={16} /></>}
              </button>

              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', marginTop: '1.75rem' }}>
                Acceso exclusivo para el equipo J&amp;M
              </p>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .jym-mobile-brand { display: none; }
        @media (max-width: 860px) {
          .jym-shell { flex-direction: column; }
          .jym-brand-panel { display: none !important; }
          .jym-mobile-brand {
            display: flex; align-items: center; gap: 10px;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            flex-shrink: 0;
          }
        }
        @keyframes jym-grid-pan {
          from { background-position: 0 0; }
          to   { background-position: 200px 200px; }
        }
        @keyframes jym-fade-in-kf {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .jym-fade-in { animation: jym-fade-in-kf .65s cubic-bezier(0.16,1,0.3,1) both; }
        .jym-delay-1 { animation-delay: .08s; }
        .jym-delay-2 { animation-delay: .16s; }
        .jym-delay-3 { animation-delay: .24s; }

        /* Transición tipo modal entre estados (form ⇄ loading ⇄ success) */
        @keyframes jym-modal-in-kf {
          from { opacity: 0; transform: translateY(6px) scale(.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .jym-modal-in { animation: jym-modal-in-kf .45s cubic-bezier(0.16,1,0.3,1) both; }

        @keyframes jym-check-draw-kf {
          from { stroke-dasharray: 24; stroke-dashoffset: 24; }
          to   { stroke-dasharray: 24; stroke-dashoffset: 0; }
        }
        .jym-check-draw { animation: jym-check-draw-kf .45s ease .15s both; }

        .jym-field {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 0.8rem 0.95rem;
          transition: border-color .25s cubic-bezier(0.16,1,0.3,1), background .25s cubic-bezier(0.16,1,0.3,1), box-shadow .25s ease;
        }
        .jym-field:focus-within {
          border-color: #f5c842;
          background: rgba(245,200,66,0.05);
          box-shadow: 0 0 0 3px rgba(245,200,66,0.1);
        }
        .jym-field-icon { color: rgba(255,255,255,0.35); flex-shrink: 0; }
        .jym-input {
          flex: 1; background: none; border: none; outline: none;
          color: #fff; font-family: var(--font-jakarta); font-size: 0.9rem;
        }
        .jym-input::placeholder { color: rgba(255,255,255,0.25); }
        .jym-submit {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 0.85rem; border-radius: 12px; border: none; cursor: pointer;
          background: linear-gradient(135deg,#b8860b,#f5c842);
          color: #0a1628; font-weight: 700; font-size: 0.92rem; font-family: var(--font-jakarta);
          box-shadow: 0 8px 24px rgba(212,160,23,0.35);
          transition: transform .2s cubic-bezier(0.16,1,0.3,1), box-shadow .2s ease;
        }
        .jym-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(212,160,23,0.45);
        }
        .jym-submit:disabled { opacity: 0.75; cursor: not-allowed; }
        .jym-spin { animation: jym-spin-kf .8s linear infinite; }
        @keyframes jym-spin-kf { to { transform: rotate(360deg); } }

        @media (prefers-reduced-motion: reduce) {
          .jym-fade-in, .jym-modal-in, .jym-check-draw { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
