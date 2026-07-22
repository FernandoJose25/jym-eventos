'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

type Stage = 'form' | 'loading' | 'success';

/* Mensajes según franja horaria — siempre hay algo relevante que decir,
   sin importar a qué hora o qué día entre el equipo. */
const FRANJAS = [
  { hasta: 5, saludo: 'Buona notte', msg: 'La ciudad duerme, pero las reservas de mañana no esperan.' },
  { hasta: 12, saludo: 'Buenos días', msg: 'Nuevo día, nuevas fiestas por planear. Vamos con todo.' },
  { hasta: 18, saludo: 'Buenas tardes', msg: 'El ritmo del día sigue. Revisa qué eventos necesitan tu toque.' },
  { hasta: 21, saludo: 'Buenas noches', msg: 'El día casi termina, pero siempre hay un detalle más por afinar.' },
  { hasta: 24, saludo: 'Buenas noches', msg: 'Trabajo nocturno también cuenta. Gracias por el compromiso.' },
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

/* ── Monstruo mascota interactivo ──
   Réplica del artifact: los ojos siguen el cursor, parpadea solo, se tapa
   los ojos + se sonroja cuando el foco entra a la contraseña, y sonríe más
   ancho al escribir el correo. Re-teñido a la paleta dorada/azul del panel. */
function MonsterMascot({
  shy,
  typingEmail,
}: {
  shy: boolean;
  typingEmail: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pupilL = useRef<SVGGElement>(null);
  const pupilR = useRef<SVGGElement>(null);
  const lidL = useRef<SVGRectElement>(null);
  const lidR = useRef<SVGRectElement>(null);
  const mouthPath = useRef<SVGPathElement>(null);

  const LID_MAX = 46;
  const centers = { L: { x: 142, y: 102 }, R: { x: 178, y: 102 } };
  const shyRef = useRef(shy);
  shyRef.current = shy;

  const setLids = useCallback((h: number) => {
    lidL.current?.setAttribute('height', String(h));
    lidR.current?.setAttribute('height', String(h));
  }, []);

  const animateLids = useCallback((to: number, dur = 140) => {
    const from = parseFloat(lidL.current?.getAttribute('height') || '0') || 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setLids(from + (to - from) * t);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [setLids]);

  // Pupilas siguen el cursor (desactivado con ojos cerrados)
  useEffect(() => {
    const track = (clientX: number, clientY: number) => {
      if (shyRef.current) return;
      const svg = svgRef.current;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      const vx = ((clientX - r.left) / r.width) * 320;
      const vy = ((clientY - r.top) / r.height) * 400;
      ([['L', pupilL.current], ['R', pupilR.current]] as const).forEach(([key, el]) => {
        if (!el) return;
        const c = centers[key];
        const dx = vx - c.x, dy = vy - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const mx = (dx / d) * Math.min(7, d / 6);
        const my = (dy / d) * Math.min(7, d / 6);
        el.setAttribute('transform', `translate(${mx.toFixed(1)} ${my.toFixed(1)})`);
      });
    };
    const onMove = (e: MouseEvent) => track(e.clientX, e.clientY);
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parpadeo periódico (solo con ojos abiertos)
  useEffect(() => {
    const id = setInterval(() => {
      if (shyRef.current) return;
      animateLids(LID_MAX, 90);
      setTimeout(() => { if (!shyRef.current) animateLids(0, 110); }, 150);
    }, 4200);
    return () => clearInterval(id);
  }, [animateLids]);

  // Reacción al modo contraseña (ojos cerrados + sonrisa tímida)
  useEffect(() => {
    if (shy) {
      pupilL.current?.setAttribute('transform', 'translate(0 0)');
      pupilR.current?.setAttribute('transform', 'translate(0 0)');
      animateLids(LID_MAX, 160);
      mouthPath.current?.setAttribute('d', 'M134 140 Q160 162 186 140 Q160 150 134 140 Z');
    } else {
      animateLids(0, 180);
      mouthPath.current?.setAttribute('d', 'M120 138 Q160 190 200 138 Q160 158 120 138 Z');
    }
  }, [shy, animateLids]);

  // Sonrisa más ancha mientras se escribe el correo
  useEffect(() => {
    if (shyRef.current) return;
    if (typingEmail) {
      mouthPath.current?.setAttribute('d', 'M116 136 Q160 200 204 136 Q160 168 116 136 Z');
    } else {
      mouthPath.current?.setAttribute('d', 'M120 138 Q160 190 200 138 Q160 158 120 138 Z');
    }
  }, [typingEmail]);

  return (
    <div className="jym-monster-wrap" aria-hidden="true">
      <svg ref={svgRef} className="jym-monster" viewBox="0 0 320 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="jym-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7AD9F0" />
            <stop offset="100%" stopColor="#4FC3E8" />
          </linearGradient>
          <linearGradient id="jym-jacket" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E5FE0" />
            <stop offset="100%" stopColor="#1E3FB0" />
          </linearGradient>
          <linearGradient id="jym-sleeve" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBF5E4" />
            <stop offset="100%" stopColor="#EFE6CE" />
          </linearGradient>
        </defs>

        <ellipse className="jym-floor-shadow" cx="160" cy="384" rx="98" ry="14" fill="#000" opacity="0.10" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />

        <g className="jym-floaty">
          {/* PIERNAS */}
          <g>
            <path d="M112 300 C104 300 100 312 100 330 L100 360 C100 374 112 380 124 380 C136 380 144 372 144 358 L144 312 C144 302 136 300 128 300 Z" fill="url(#jym-skin)" />
            <path d="M208 300 C216 300 220 312 220 330 L220 360 C220 374 208 380 196 380 C184 380 176 372 176 358 L176 312 C176 302 184 300 192 300 Z" fill="url(#jym-skin)" />
            <ellipse cx="118" cy="378" rx="26" ry="13" fill="#3FB0D6" />
            <ellipse cx="202" cy="378" rx="26" ry="13" fill="#3FB0D6" />
            <circle cx="104" cy="374" r="5" fill="#EAF7FC" /><circle cx="116" cy="379" r="5" fill="#EAF7FC" /><circle cx="128" cy="379" r="5" fill="#EAF7FC" />
            <circle cx="192" cy="379" r="5" fill="#EAF7FC" /><circle cx="204" cy="379" r="5" fill="#EAF7FC" /><circle cx="216" cy="374" r="5" fill="#EAF7FC" />
            <ellipse cx="120" cy="336" rx="13" ry="16" fill="#C9A227" opacity=".9" />
            <ellipse cx="200" cy="340" rx="12" ry="15" fill="#C9A227" opacity=".9" />
          </g>

          {/* CUERNOS */}
          <path d="M120 74 C96 60 84 36 92 26 C104 30 106 46 116 56 C122 62 124 68 128 74 Z" fill="#E7CBA0" stroke="#D6B586" strokeWidth="2" />
          <path d="M200 74 C224 60 236 36 228 26 C216 30 214 46 204 56 C198 62 196 68 192 74 Z" fill="#E7CBA0" stroke="#D6B586" strokeWidth="2" />
          <g stroke="#3FB0D6" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M148 60 C146 44 142 38 138 34" />
            <path d="M158 58 C158 40 158 34 158 28" />
            <path d="M168 60 C170 44 176 38 182 34" />
            <path d="M153 59 C151 46 149 40 147 32" />
            <path d="M163 59 C165 46 168 40 172 32" />
          </g>

          {/* BRAZO IZQUIERDO */}
          <g>
            <path d="M74 168 C50 178 40 214 44 258 C46 280 58 290 76 288 L96 200 Z" fill="url(#jym-sleeve)" />
            <path d="M44 258 C46 280 58 290 76 288 L80 268 C64 270 52 262 48 250 Z" fill="#2E5FE0" />
            <rect x="46" y="256" width="34" height="6" fill="#fff" opacity=".85" transform="rotate(-6 63 259)" />
            <circle cx="62" cy="284" r="21" fill="url(#jym-skin)" />
            <circle cx="50" cy="278" r="7" fill="#4FC3E8" /><circle cx="52" cy="292" r="7" fill="#4FC3E8" /><circle cx="64" cy="298" r="7" fill="#4FC3E8" />
            <ellipse cx="60" cy="284" rx="10" ry="8" fill="#C9A227" opacity=".55" />
          </g>

          {/* BRAZO DERECHO */}
          <g>
            <path d="M246 168 C270 178 280 214 276 258 C274 280 262 290 244 288 L224 200 Z" fill="url(#jym-sleeve)" />
            <path d="M276 258 C274 280 262 290 244 288 L240 268 C256 270 268 262 272 250 Z" fill="#2E5FE0" />
            <rect x="240" y="256" width="34" height="6" fill="#fff" opacity=".85" transform="rotate(6 257 259)" />
            <circle cx="258" cy="284" r="21" fill="url(#jym-skin)" />
            <circle cx="270" cy="278" r="7" fill="#4FC3E8" /><circle cx="268" cy="292" r="7" fill="#4FC3E8" /><circle cx="256" cy="298" r="7" fill="#4FC3E8" />
            <ellipse cx="260" cy="284" rx="10" ry="8" fill="#C9A227" opacity=".55" />
          </g>

          {/* CUERPO */}
          <path d="M160 52 C104 52 80 92 80 132 C80 156 92 170 100 184 C86 198 82 238 90 282 C96 318 124 334 160 334 C196 334 224 318 230 282 C238 238 234 198 220 184 C228 170 240 156 240 132 C240 92 216 52 160 52 Z" fill="url(#jym-skin)" />
          <ellipse cx="160" cy="132" rx="62" ry="54" fill="#BDEBF6" opacity=".85" />
          <path d="M160 188 C196 188 214 216 210 264 C206 302 186 318 160 318 C134 318 114 302 110 264 C106 216 124 188 160 188 Z" fill="#CFEFF8" opacity=".6" />
          <ellipse cx="126" cy="250" rx="14" ry="17" fill="#C9A227" opacity=".9" />
          <ellipse cx="196" cy="250" rx="14" ry="17" fill="#C9A227" opacity=".9" />
          <ellipse cx="160" cy="292" rx="13" ry="15" fill="#C9A227" opacity=".9" />

          {/* CHAQUETA */}
          <path d="M104 180 C86 196 82 236 90 282 L128 282 C120 240 122 200 132 184 C124 178 112 176 104 180 Z" fill="url(#jym-jacket)" />
          <path d="M216 180 C234 196 238 236 230 282 L192 282 C200 240 198 200 188 184 C196 178 208 176 216 180 Z" fill="url(#jym-jacket)" />
          <path d="M132 184 L160 202 L188 184 L180 196 L160 210 L140 196 Z" fill="#24399A" />
          <path d="M92 276 L128 276 L128 284 L91 284 Z" fill="#fff" opacity=".92" />
          <path d="M192 276 L228 276 L229 284 L192 284 Z" fill="#fff" opacity=".92" />
          <circle cx="150" cy="222" r="3.2" fill="#12225E" />
          <circle cx="150" cy="240" r="3.2" fill="#12225E" />
          <circle cx="150" cy="258" r="3.2" fill="#12225E" />

          {/* CARA */}
          <g>
            <ellipse cx="142" cy="100" rx="19" ry="22" fill="#fff" />
            <ellipse cx="178" cy="100" rx="19" ry="22" fill="#fff" />
            <g ref={pupilL}>
              <circle cx="142" cy="102" r="11" fill="#2E7FD6" />
              <circle cx="142" cy="102" r="6" fill="#17172A" />
              <circle cx="139" cy="98" r="2.6" fill="#fff" />
            </g>
            <g ref={pupilR}>
              <circle cx="178" cy="102" r="11" fill="#2E7FD6" />
              <circle cx="178" cy="102" r="6" fill="#17172A" />
              <circle cx="175" cy="98" r="2.6" fill="#fff" />
            </g>
            <rect ref={lidL} x="123" y="76" width="38" height="0" rx="8" fill="#5FCBEC" />
            <rect ref={lidR} x="159" y="76" width="38" height="0" rx="8" fill="#5FCBEC" />
          </g>

          {/* GAFAS */}
          <g fill="none" stroke="#1F1F1F" strokeWidth="6">
            <rect x="118" y="78" width="48" height="46" rx="20" />
            <rect x="154" y="78" width="48" height="46" rx="20" />
            <path d="M166 96 q-6 -5 -12 0" strokeLinecap="round" />
            <path d="M118 92 l-16 -4" strokeLinecap="round" />
            <path d="M202 92 l16 -4" strokeLinecap="round" />
          </g>

          <ellipse cx="160" cy="126" rx="8" ry="6.5" fill="#3AA0C8" />

          {/* BOCA */}
          <g>
            <path ref={mouthPath} d="M120 138 Q160 190 200 138 Q160 158 120 138 Z" fill="#B85560" />
            <path d="M126 140 Q160 168 194 140 Q160 150 126 140 Z" fill="#E58A93" opacity=".7" />
            <path d="M136 141 h15 v11 q-7 3 -15 1 Z" fill="#fff" />
            <path d="M153 143 h16 v12 q-8 3 -16 0 Z" fill="#fff" />
            <path d="M171 141 h15 v11 q-8 3 -15 -1 Z" fill="#fff" />
            <line x1="151" y1="141" x2="151" y2="153" stroke="#E3E3E3" strokeWidth="1.2" />
            <line x1="169" y1="143" x2="169" y2="155" stroke="#E3E3E3" strokeWidth="1.2" />
            <ellipse cx="160" cy="166" rx="13" ry="7" fill="#E8544E" opacity=".9" />
          </g>

          {/* SONROJO */}
          <g className="jym-blush" style={{ opacity: shy ? 1 : 0 }}>
            <ellipse cx="118" cy="120" rx="12" ry="8" fill="#F5C842" opacity=".55" />
            <ellipse cx="202" cy="120" rx="12" ry="8" fill="#F5C842" opacity=".55" />
          </g>
        </g>
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();
  const [stage, setStage] = useState<Stage>('form');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [passFocused, setPassFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const { saludo, msg, hora, fecha } = useGreeting();

  // El monstruo se tapa los ojos cuando el foco está en la contraseña
  // Y esta oculta (si el usuario pulsa "ver", los abre para "espiar").
  const shy = passFocused && !showPass;

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
      // Navegación dura: fuerza una request real al servidor para que
      // middleware.ts vea la cookie recién seteada por /api/session. Un
      // router.push (soft nav) puede evaluarse antes de que el navegador
      // confirme el Set-Cookie, provocando un rebote silencioso a /login.
      setTimeout(() => { window.location.href = '/dashboard'; }, 900);
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

      {/* UNA sola tarjeta que envuelve todo: monstruo grande a la izquierda,
          formulario a la derecha. */}
      <div className="jym-card jym-rise jym-rise-2">
        <div className="jym-card-seal" />

        {/* ── Panel izquierdo: monstruo grande + titular editorial ── */}
        <div className="jym-left" key={saludo}>
          {/* Mascota reactiva a los campos — protagonista del lado izquierdo */}
          <MonsterMascot shy={shy} typingEmail={emailFocused && !!email} />

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

        {/* ── Panel derecho: formulario ── */}
        <div className="jym-right">
          {stage === 'success' ? (
            <div className="jym-modal-in" style={{ textAlign: 'center', padding: '0.5rem 0', width: '100%' }}>
              <div className="jym-success-badge">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" className="jym-check-draw" />
                </svg>
              </div>
              <p className="jym-success-title">Acceso concedido</p>
              <p className="jym-success-sub">Redirigiendo al panel...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="jym-modal-in jym-form">
              <div className="jym-brandmark">
                <span className="jym-brandmark-icon">🎉</span>
                <div>
                  <p className="jym-brandmark-name">J&amp;M Decoraciones y Eventos</p>
                  <p className="jym-brandmark-tag">Panel Administrativo</p>
                </div>
              </div>

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
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
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
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
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
          height: 100vh; height: 100dvh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(1rem, 3vw, 2.5rem);
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

        /* ── Panel izquierdo (monstruo + titular) ── */
        .jym-left {
          position: relative; z-index: 2;
          flex: 1 1 46%; min-width: 0;
          padding: clamp(1.5rem, 3vw, 2.5rem) clamp(1.5rem, 3.5vw, 3rem);
          display: flex; flex-direction: column;
          align-items: flex-start; justify-content: center;
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        .jym-brandmark { display: flex; align-items: center; gap: 12px; margin-bottom: 1.5rem; }
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
          font-size: clamp(2rem, 3vw, 2.9rem); line-height: 1.0;
          letter-spacing: -.02em; margin: 0 0 1rem;
        }
        .jym-headline-dot { color: #f5c842; }
        .jym-sub {
          color: rgba(255,255,255,0.5); font-size: clamp(0.92rem, 1vw, 1.02rem);
          line-height: 1.6; max-width: 360px; margin: 0 0 1.4rem;
        }
        .jym-locale { color: rgba(255,255,255,0.22); font-size: 0.75rem; margin: 0; letter-spacing: .02em; }

        /* ── Tarjeta única (envuelve todo) ── */
        .jym-card {
          position: relative; z-index: 3;
          width: min(920px, 100%); max-height: calc(100vh - 2rem); max-height: calc(100dvh - 2rem);
          display: flex; align-items: stretch;
          background: linear-gradient(165deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 26px;
          overflow: hidden;
          backdrop-filter: blur(28px) saturate(140%);
          -webkit-backdrop-filter: blur(28px) saturate(140%);
          box-shadow:
            0 30px 70px -20px rgba(0,0,0,0.55),
            0 0 0 1px rgba(255,255,255,0.02) inset,
            0 1px 0 rgba(255,255,255,0.08) inset;
        }
        .jym-card-seal {
          position: absolute; top: 0; left: 8%; right: 8%; height: 1px;
          background: linear-gradient(90deg, transparent, #f5c842 50%, transparent);
          opacity: 0.55; z-index: 4;
        }

        /* ── Panel derecho (formulario) ── */
        .jym-right {
          flex: 1 1 54%; min-width: 0;
          padding: clamp(1.5rem, 3vw, 2.4rem) clamp(1.75rem, 4vw, 2.6rem);
          display: flex; align-items: center; justify-content: center;
          overflow-y: auto;
        }
        .jym-form { width: 100%; max-width: 360px; }

        /* ── Mascota monstruo (protagonista del lado izquierdo, grande) ──
           Se limita por altura para que la escena entera quepa en 100vh. */
        .jym-monster-wrap {
          width: 100%; max-width: 300px; margin: 0 auto 1.25rem;
          filter: drop-shadow(0 22px 36px rgba(0,0,0,0.42));
        }
        .jym-monster {
          width: 100%; height: auto; max-height: 46vh;
          display: block; margin: 0 auto; overflow: visible;
        }
        .jym-floaty { animation: jym-float 3.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; will-change: transform; }
        @keyframes jym-float {
          0%   { transform: translateY(0) rotate(0deg); }
          50%  { transform: translateY(-16px) rotate(-1.2deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        .jym-floor-shadow { animation: jym-shadow 3.4s ease-in-out infinite; }
        @keyframes jym-shadow {
          0%,100% { transform: scale(1); opacity: 0.10; }
          50%     { transform: scale(0.82); opacity: 0.06; }
        }
        .jym-blush { transition: opacity .25s ease; }

        .jym-eyebrow {
          color: #f5c842; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: .22em; margin: 0 0 0.55rem;
        }
        .jym-card-title {
          font-family: var(--font-playfair); color: #fff; font-size: 1.5rem; font-weight: 700;
          margin: 0 0 1.5rem; letter-spacing: -.01em;
        }
        /* Brandmark dentro del formulario: más compacto */
        .jym-form .jym-brandmark { margin-bottom: 1.4rem; }
        .jym-form .jym-brandmark-icon { width: 38px; height: 38px; font-size: 1.15rem; }
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
          text-align: center; color: rgba(255,255,255,0.22); font-size: 0.7rem; margin-top: 1.35rem;
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
        /* Tablet/móvil: las dos columnas se apilan; aquí SÍ se permite scroll
           porque un login apilado no cabe en una sola pantalla. */
        @media (max-width: 860px) {
          .jym-scene {
            height: auto; min-height: 100dvh;
            align-items: flex-start;
            overflow-y: auto;
            padding: 2rem 1.25rem;
          }
          .jym-card {
            flex-direction: column; width: 100%; max-width: 460px; max-height: none; margin: 0 auto;
          }
          .jym-left {
            border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06);
            align-items: center; text-align: center;
            padding: 2rem 1.5rem 1.5rem;
          }
          .jym-datestamp { align-self: center; }
          .jym-sub { margin-left: auto; margin-right: auto; }
          .jym-monster-wrap { max-width: 190px; margin: 0.5rem auto 1.25rem; }
          .jym-monster { max-height: none; }
          .jym-right { padding: 1.75rem 1.5rem 2rem; overflow-y: visible; }
          .jym-form { max-width: 100%; }
          .jym-locale { display: none; }
        }
        @media (max-width: 420px) {
          .jym-scene { padding: 1.5rem 1rem; }
          .jym-card { border-radius: 20px; }
          .jym-left { padding: 1.75rem 1.25rem 1.25rem; }
          .jym-monster-wrap { max-width: 150px; margin-bottom: 1rem; }
          .jym-headline { font-size: 1.85rem; }
          .jym-sub { font-size: 0.9rem; }
          .jym-right { padding: 1.5rem 1.25rem 1.75rem; }
          .jym-card-title { font-size: 1.4rem; }
        }

        @media (prefers-reduced-motion: reduce) {
          .jym-rise, .jym-fade-in, .jym-modal-in, .jym-check-draw, .jym-glow, .jym-floaty, .jym-floor-shadow { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
