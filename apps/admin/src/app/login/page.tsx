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
    } catch (err: any) {
      setStage('form');
      setError(
        err?.message?.includes('Demasiados intentos')
          ? err.message
          : 'Correo o contraseña incorrectos'
      );
    }
  };

  if (loading) return null;

  return (
    <div className="jym-scene">
      {/* Atmósfera de fondo: veladura de luz dorada + grano */}
      <div className="jym-glow jym-glow-a" />
      <div className="jym-glow jym-glow-b" />
      <div className="jym-grain" />
      <div className="jym-hairline" />

      {/* Titular editorial — vive detrás/junto a la tarjeta, no en un panel separado */}
      <div className="jym-editorial" key={saludo}>
        <div className="jym-brandmark jym-rise">
          <span className="jym-brandmark-icon">🎉</span>
          <div>
            <p className="jym-brandmark-name">J&amp;M Decoraciones y Eventos</p>
            <p className="jym-brandmark-tag">Panel Administrativo</p>
          </div>
        </div>

        {fecha && (
          <p className="jym-datestamp jym-rise jym-rise-1">
            <span className="jym-dot" />
            {fecha} · {hora}
          </p>
        )}

        <h1 className="jym-headline jym-rise jym-rise-2">
          {saludo},<br />equipo J&amp;M<span className="jym-headline-dot">.</span>
        </h1>

        <p className="jym-sub jym-rise jym-rise-3">{msg}</p>

        <p className="jym-locale jym-rise jym-rise-3">Sechura, Piura · Desde 2014</p>
      </div>

      {/* Tarjeta de vidrio — desplazada, no centrada en simetría perfecta */}
      <div className="jym-card-wrap jym-rise jym-rise-2">
        <div className="jym-card">
          <div className="jym-card-seal" />

          {stage === 'success' ? (
            <div className="jym-modal-in" style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div className="jym-success-badge">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" className="jym-check-draw" />
                </svg>
              </div>
              <p className="jym-success-title">Acceso concedido</p>
              <p className="jym-success-sub">Redirigiendo al panel...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="jym-modal-in">
              <p className="jym-eyebrow">Iniciar sesión</p>
              <h2 className="jym-card-title">Ingresa a tu cuenta</h2>

              <label className="jym-label">Correo electrónico</label>
              <div className="jym-field" style={{ marginBottom: '1.4rem' }}>
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

              <label className="jym-label">Contraseña</label>
              <div className="jym-field" style={{ marginBottom: error ? '1rem' : '1.9rem' }}>
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
                  className="jym-eye-btn"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <div className="jym-fade-in jym-error">
                  {error}
                </div>
              )}

              <button type="submit" disabled={stage === 'loading'} className="jym-submit">
                {stage === 'loading'
                  ? <Loader2 size={16} className="jym-spin" />
                  : <>Ingresar al panel <ArrowRight size={16} /></>}
              </button>

              <p className="jym-footnote">Acceso exclusivo para el equipo J&amp;M</p>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .jym-scene {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(1.5rem, 5vw, 5rem);
          background:
            radial-gradient(120% 90% at 15% 10%, #16233d 0%, transparent 55%),
            linear-gradient(155deg, #050b16 0%, #081226 40%, #0a1628 75%, #050b16 100%);
          font-family: var(--font-jakarta);
        }

        /* ── Atmósfera ── */
        .jym-glow {
          position: absolute; border-radius: 50%; pointer-events: none;
          filter: blur(60px);
        }
        .jym-glow-a {
          width: 620px; height: 620px; top: -18%; right: -12%;
          background: radial-gradient(circle, rgba(245,200,66,0.14) 0%, transparent 70%);
          animation: jym-drift 22s ease-in-out infinite;
        }
        .jym-glow-b {
          width: 520px; height: 520px; bottom: -20%; left: -10%;
          background: radial-gradient(circle, rgba(37,99,235,0.16) 0%, transparent 70%);
          animation: jym-drift 26s ease-in-out infinite reverse;
        }
        @keyframes jym-drift {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(3%, -3%) scale(1.06); }
        }
        .jym-grain {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.05; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .jym-hairline {
          position: absolute; left: 0; right: 0; top: 0; height: 1px; pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(245,200,66,0.35), transparent);
        }

        /* ── Titular editorial ── */
        .jym-editorial {
          position: relative; z-index: 2;
          flex: 1 1 480px; max-width: 560px;
          padding-right: clamp(1.5rem, 4vw, 4rem);
        }
        .jym-brandmark { display: flex; align-items: center; gap: 12px; margin-bottom: clamp(2.5rem, 6vw, 5rem); }
        .jym-brandmark-icon {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; font-size: 1.3rem;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg,#b8860b,#f5c842);
          box-shadow: 0 8px 22px rgba(212,160,23,0.35);
        }
        .jym-brandmark-name {
          color: #fff; font-family: var(--font-playfair); font-weight: 700;
          font-size: 1.02rem; line-height: 1.2; margin: 0; letter-spacing: -.01em;
        }
        .jym-brandmark-tag {
          color: rgba(255,255,255,0.4); font-size: 0.66rem; margin: 3px 0 0;
          letter-spacing: .16em; text-transform: uppercase;
        }

        .jym-datestamp {
          display: inline-flex; align-items: center; gap: 8px;
          color: #f5c842; font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: .2em; margin: 0 0 1.2rem;
        }
        .jym-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #f5c842;
          box-shadow: 0 0 10px #f5c842; display: inline-block;
        }
        .jym-headline {
          font-family: var(--font-playfair); color: #fff; font-weight: 700;
          font-size: clamp(2.6rem, 5.2vw, 4.6rem); line-height: 0.98;
          letter-spacing: -.02em; margin: 0 0 1.3rem;
        }
        .jym-headline-dot { color: #f5c842; }
        .jym-sub {
          color: rgba(255,255,255,0.5); font-size: clamp(1rem, 1.1vw, 1.15rem);
          line-height: 1.65; max-width: 420px; margin: 0 0 clamp(2rem, 5vw, 3.5rem);
        }
        .jym-locale { color: rgba(255,255,255,0.22); font-size: 0.75rem; margin: 0; letter-spacing: .02em; }

        /* ── Tarjeta de vidrio ── */
        .jym-card-wrap {
          position: relative; z-index: 3;
          flex: 0 1 400px; width: 100%; max-width: 400px;
          transform: translateY(-6px);
        }
        .jym-card {
          position: relative;
          background: linear-gradient(165deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 22px;
          padding: clamp(2rem, 4vw, 2.6rem) clamp(1.75rem, 4vw, 2.4rem);
          backdrop-filter: blur(28px) saturate(140%);
          -webkit-backdrop-filter: blur(28px) saturate(140%);
          box-shadow:
            0 30px 70px -20px rgba(0,0,0,0.55),
            0 0 0 1px rgba(255,255,255,0.02) inset,
            0 1px 0 rgba(255,255,255,0.08) inset;
        }
        .jym-card-seal {
          position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
          background: linear-gradient(90deg, transparent, #f5c842 50%, transparent);
          opacity: 0.55;
        }

        .jym-eyebrow {
          color: #f5c842; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: .22em; margin: 0 0 0.55rem;
        }
        .jym-card-title {
          font-family: var(--font-playfair); color: #fff; font-size: 1.6rem; font-weight: 700;
          margin: 0 0 1.9rem; letter-spacing: -.01em;
        }
        .jym-label {
          display: block; color: rgba(255,255,255,0.45); font-size: 0.72rem;
          font-weight: 600; letter-spacing: .04em; margin-bottom: 8px;
        }
        .jym-field {
          display: flex; align-items: center; gap: 10px;
          border-bottom: 1.5px solid rgba(255,255,255,0.14);
          padding: 0.6rem 0.15rem 0.7rem;
          transition: border-color .3s cubic-bezier(0.16,1,0.3,1);
        }
        .jym-field:focus-within { border-color: #f5c842; }
        .jym-field-icon { color: rgba(255,255,255,0.32); flex-shrink: 0; transition: color .3s ease; }
        .jym-field:focus-within .jym-field-icon { color: #f5c842; }
        .jym-input {
          flex: 1; background: none; border: none; outline: none;
          color: #fff; font-family: var(--font-jakarta); font-size: 0.92rem;
        }
        .jym-input::placeholder { color: rgba(255,255,255,0.22); }
        .jym-eye-btn {
          background: none; border: none; color: rgba(255,255,255,0.35);
          cursor: pointer; display: flex; padding: 4px; transition: color .2s ease;
        }
        .jym-eye-btn:hover { color: rgba(255,255,255,0.7); }

        .jym-error {
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
          border-radius: 10px; padding: 0.65rem 0.9rem;
          color: #fca5a5; font-size: 0.8rem; margin-bottom: 1.6rem;
        }

        .jym-submit {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 0.9rem; border-radius: 12px; border: none; cursor: pointer;
          background: linear-gradient(135deg,#b8860b,#f5c842);
          color: #0a1628; font-weight: 700; font-size: 0.92rem; font-family: var(--font-jakarta);
          box-shadow: 0 10px 26px rgba(212,160,23,0.3);
          transition: transform .25s cubic-bezier(0.16,1,0.3,1), box-shadow .25s ease, filter .2s ease;
        }
        .jym-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 34px rgba(212,160,23,0.42);
          filter: brightness(1.04);
        }
        .jym-submit:active:not(:disabled) { transform: translateY(0); }
        .jym-submit:disabled { opacity: 0.75; cursor: not-allowed; }
        .jym-spin { animation: jym-spin-kf .8s linear infinite; }
        @keyframes jym-spin-kf { to { transform: rotate(360deg); } }

        .jym-footnote {
          text-align: center; color: rgba(255,255,255,0.22); font-size: 0.7rem; margin-top: 1.75rem;
        }

        .jym-success-badge {
          width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 1.2rem;
          background: linear-gradient(135deg,#f5c842,#d4a017);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 10px 30px rgba(212,160,23,0.4);
        }
        .jym-success-title { color: #fff; font-family: var(--font-playfair); font-size: 1.25rem; font-weight: 700; margin: 0 0 0.4rem; }
        .jym-success-sub { color: rgba(255,255,255,0.4); font-size: 0.85rem; margin: 0; }

        /* ── Animaciones de entrada ── */
        @keyframes jym-rise-kf {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .jym-rise { animation: jym-rise-kf .75s cubic-bezier(0.16,1,0.3,1) both; }
        .jym-rise-1 { animation-delay: .1s; }
        .jym-rise-2 { animation-delay: .18s; }
        .jym-rise-3 { animation-delay: .28s; }

        @keyframes jym-fade-in-kf { from { opacity: 0; } to { opacity: 1; } }
        .jym-fade-in { animation: jym-fade-in-kf .5s ease both; }

        @keyframes jym-modal-in-kf {
          from { opacity: 0; transform: translateY(8px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .jym-modal-in { animation: jym-modal-in-kf .5s cubic-bezier(0.16,1,0.3,1) both; }

        @keyframes jym-check-draw-kf {
          from { stroke-dasharray: 24; stroke-dashoffset: 24; }
          to   { stroke-dasharray: 24; stroke-dashoffset: 0; }
        }
        .jym-check-draw { animation: jym-check-draw-kf .45s ease .15s both; }

        /* ── Layout responsivo ── */
        @media (max-width: 980px) {
          .jym-scene {
            flex-direction: column; justify-content: flex-start;
            align-items: stretch; min-height: 100dvh;
            padding: 2.5rem 1.5rem 2rem;
          }
          .jym-editorial { max-width: 560px; padding-right: 0; text-align: center; margin-bottom: 1.75rem; }
          .jym-brandmark { justify-content: center; margin-bottom: 1.5rem; }
          .jym-datestamp { display: inline-flex; margin-bottom: 0.9rem; }
          .jym-headline { margin-bottom: 0.7rem; }
          .jym-sub { margin: 0 auto; }
          .jym-locale { display: none; }
          .jym-card-wrap { transform: none; margin: 0 auto; }
        }
        @media (max-width: 480px) {
          .jym-scene { padding: 2rem 1.25rem 1.5rem; }
          .jym-headline { font-size: 2rem; }
          .jym-brandmark { margin-bottom: 1.25rem; }
          .jym-sub { font-size: 0.95rem; margin-bottom: 0; }
          .jym-card { padding: 1.75rem 1.4rem; border-radius: 18px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .jym-rise, .jym-fade-in, .jym-modal-in, .jym-check-draw, .jym-glow { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
