'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import VideoSoundControl from '@/components/ui/VideoSoundControl';
import { cxVideo, cxVideoThumb } from '@/lib/cloudinary';

interface HeroData {
  h1?: string;
  eyebrow?: string;
  desc?: string;
  bgImage?: string;
  bgPos?: string;
  bgMediaType?: string;
  bgVideoSound?: boolean;
  btn1Text?: string;
  btn1Link?: string;
  btn2Text?: string;
  btn2Link?: string;
}

export default function HeroSection({ data }: { data: HeroData }) {
  const ref    = useRef<HTMLDivElement>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const h1Ref  = useRef<HTMLHeadingElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);

  const isVideo = data.bgMediaType === 'video';

  // El video de fondo pesa varios MB: montarlo desde el primer render hace que
  // compita con el LCP (título, imagen, fuentes). Se difiere hasta window.load
  // (o 3.5s como tope) y mientras tanto se muestra el poster/gradiente.
  const [videoReady, setVideoReady] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);

  useEffect(() => {
    if (!isVideo) return;
    let done = false;
    const start = () => { if (!done) { done = true; setVideoReady(true); } };
    if (document.readyState === 'complete') { start(); return; }
    window.addEventListener('load', start, { once: true });
    const t = setTimeout(start, 3500);
    return () => { window.removeEventListener('load', start); clearTimeout(t); };
  }, [isVideo]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity .7s cubic-bezier(0.16,1,0.3,1), transform .7s cubic-bezier(0.16,1,0.3,1)';

    const t = setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 100);

    return () => clearTimeout(t);
  }, []);

  // Titular palabra por palabra: el h1 llega del admin como HTML (puede traer
  // <em> con su propio gradiente). Se envuelve cada palabra suelta en un span
  // animable y los elementos (em) se animan enteros para no romper su
  // background-clip:text. El texto completo ya está en el HTML del servidor,
  // así que Google lo lee igual.
  useEffect(() => {
    const el = h1Ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    Array.from(el.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        (node.textContent || '').split(/(\s+)/).forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
          const s = document.createElement('span');
          s.className = 'hero-word';
          s.textContent = w;
          frag.appendChild(s);
        });
        node.parentNode?.replaceChild(frag, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        (node as HTMLElement).classList.add('hero-word');
      }
    });
    el.querySelectorAll<HTMLElement>('.hero-word').forEach((s, i) => {
      s.style.animationDelay = `${0.15 + i * 0.1}s`;
    });
    el.classList.add('hero-words-ready');
  }, []);

  // Partículas doradas: solo desktop, sin reduced-motion, y arrancan tras
  // window.load para no competir con el LCP.
  useEffect(() => {
    const cv = dustRef.current;
    if (!cv) return;
    if (window.innerWidth < 768 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let stopped = false;
    const start = () => {
      if (stopped) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      let W = 0, H = 0;
      const size = () => { W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight; };
      size();
      window.addEventListener('resize', size);
      const P = Array.from({ length: 36 }, () => ({
        x: Math.random(), y: Math.random(), r: 0.8 + Math.random() * 1.8,
        s: 0.0002 + Math.random() * 0.0005, ph: Math.random() * 6.28, a: 0.2 + Math.random() * 0.45,
      }));
      const tick = (t: number) => {
        ctx.clearRect(0, 0, W, H);
        for (const p of P) {
          p.y -= p.s;
          if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
          const tw = 0.5 + 0.5 * Math.sin(t * 0.001 + p.ph);
          ctx.beginPath();
          ctx.arc(p.x * W + Math.sin(t * 0.0004 + p.ph) * 12, p.y * H, p.r, 0, 6.28);
          ctx.fillStyle = `rgba(245,200,66,${(p.a * tw).toFixed(3)})`;
          ctx.fill();
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => { stopped = true; cancelAnimationFrame(raf); window.removeEventListener('load', start); };
  }, []);

  const h1 =
    data.h1 ||
    'Hacemos que cada celebración sea <em style="background:linear-gradient(135deg,#b8860b 0%,#f5c842 40%,#b8860b 80%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:heroShimmer 4s linear infinite;font-style:italic;">Mágica</em>';

  const eyebrow =
    data.eyebrow || 'J&M Decoraciones y Eventos';

  const desc =
    data.desc ||
    'Organizamos y diseñamos eventos personalizados para bodas, quinceaños, cumpleaños y fiestas temáticas.';

  const btn1 = data.btn1Text || 'Cotizar Ahora';
  const btn1url = data.btn1Link || '/contacto';

  const btn2 = data.btn2Text || 'Ver Servicios';
  const btn2url = data.btn2Link || '/#servicios';

  const bgPos = data.bgPos || 'center center';

  // cxVideo/cxVideoThumb solo transforman URLs de Cloudinary; para Firebase
  // Storage devuelven la URL intacta, así que el poster solo existe si cambió.
  const videoSrc = isVideo && data.bgImage ? cxVideo(data.bgImage) : '';
  const thumb = isVideo && data.bgImage ? cxVideoThumb(data.bgImage) : '';
  const poster = thumb && thumb !== data.bgImage ? thumb : undefined;

  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background:
          'linear-gradient(135deg,#050d1a 0%,#0a1628 40%,#1e3a5f 100%)',
      }}
    >
      {/* BACKGROUND */}
      {data.bgImage && (
        <div
          className="hero-kb"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.72,
            zIndex: 0,
          }}
        >
          {isVideo ? (
            <>
              {poster && !videoVisible && (
                <Image
                  src={poster}
                  alt=""
                  fill
                  priority
                  sizes="100vw"
                  style={{ objectFit: 'cover', objectPosition: bgPos }}
                />
              )}
              {videoReady && (
                <video
                  key={videoSrc}
                  ref={vidRef}
                  src={videoSrc}
                  autoPlay
                  muted
                  loop
                  playsInline
                  onPlaying={() => setVideoVisible(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: bgPos,
                    opacity: videoVisible ? 1 : 0,
                    transition: 'opacity .6s ease',
                  }}
                />
              )}
              {data.bgVideoSound && (
                <VideoSoundControl videoRef={vidRef} position="bottom-right" />
              )}
            </>
          ) : (
            <Image
              src={data.bgImage}
              alt=""
              fill
              priority
              sizes="100vw"
              style={{
                objectFit: 'cover',
                objectPosition: bgPos,
              }}
            />
          )}
        </div>
      )}

      {/* OVERLAY */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: `
            linear-gradient(
              135deg,
              rgba(25, 8, 45, .55) 0%,
              rgba(4, 23, 163, 0.29) 85%,
              rgba(218, 196, 4, 0.25) 100%
            )
          `,
        }}
      />

      {/* PARTÍCULAS DORADAS (solo desktop, tras window.load) */}
      <canvas
        ref={dustRef}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
      />

      {/* DECORATIVE CIRCLES */}
      {[900, 650, 400].map((s) => (
        <div
          key={s}
          style={{
            position: 'absolute',
            width: s,
            height: s,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.05)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* CONTENT */}
      <div
        ref={ref}
        className="container hero-content"
        style={{
          position: 'relative',
          zIndex: 10,

          width: '100%',
          maxWidth: 'clamp(1200px, 62vw, 1680px)',

          margin: '0 auto',

          paddingTop: '7rem',
          paddingBottom: '5rem',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',

          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',

          textAlign: 'center',
        }}
      >
        {/* EYEBROW */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,

            marginBottom: '1.5rem',

            padding: '0.6rem 1.2rem',

            borderRadius: '9999px',

            background: 'rgba(212,160,23,0.10)',

            border: '1px solid rgba(212,160,23,0.25)',

            color: '#f5c842',

            fontSize: 'clamp(0.78rem, 0.85vw, 1rem)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',

            backdropFilter: 'blur(8px)',
          }}
        >
          ✨ {eyebrow}
        </div>

        {/* TITLE */}
        <h1
          ref={h1Ref}
          style={{
            fontFamily: 'var(--font-playfair)',

            color: '#fff',

            fontSize: 'clamp(2.4rem, 9vw, 7rem)',

            lineHeight: 0.95,

            fontWeight: 700,

            letterSpacing: '-0.04em',

            maxWidth: '980px',

            margin: '0 auto 1.8rem',

            textWrap: 'balance',

            textShadow: '0 4px 30px rgba(0,0,0,0.35)',
          }}
          dangerouslySetInnerHTML={{ __html: h1 }}
        />

        {/* DESCRIPTION */}
        <p
          style={{
            color: 'rgba(255,255,255,0.82)',

            fontSize: 'clamp(1.15rem, 1.4vw, 1.6rem)',

            lineHeight: 1.8,

            maxWidth: 'min(760px, 60vw)',

            margin: '0 auto 2.8rem',

            fontWeight: 400,
          }}
        >
          {desc}
        </p>

        {/* BUTTON */}
        <div
          className="hero-btns"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1.2rem',
            marginBottom: '3rem',
            flexWrap: 'wrap',
          }}
        >
          {/* BOTÓN PRINCIPAL */}
          <a
            href={btn1url}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',

              padding: '1rem 2.4rem',

              borderRadius: '9999px',

              background:
                'linear-gradient(135deg,#d4a017,#f5c842)',

              color: '#0a1628',

              fontWeight: 700,

              fontSize: '1rem',

              textDecoration: 'none',

              whiteSpace: 'nowrap',

              boxShadow:
                '0 10px 35px rgba(212,160,23,0.35)',

              transition:
                'all .35s cubic-bezier(.4,0,.2,1)',

              transform: 'translateY(0)',
            }}

            onMouseEnter={(e) => {
              e.currentTarget.style.transform =
                'translateY(-4px) scale(1.03)';

              e.currentTarget.style.boxShadow =
                '0 18px 45px rgba(212,160,23,0.55)';
            }}

            onMouseLeave={(e) => {
              e.currentTarget.style.transform =
                'translateY(0) scale(1)';

              e.currentTarget.style.boxShadow =
                '0 10px 35px rgba(212,160,23,0.35)';
            }}
          >
            ✨ {btn1}
          </a>

          {/* BOTÓN SECUNDARIO */}
          <a
            href={btn2url}
            onClick={(e) => {
              if (btn2url === '/#servicios' || btn2url === '#servicios') {
                e.preventDefault();
                document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',

              padding: '1rem 2.4rem',

              borderRadius: '9999px',

              border:
                '1.5px solid rgba(255,255,255,0.35)',

              background: 'rgba(255,255,255,0.03)',

              backdropFilter: 'blur(10px)',

              color: '#fff',

              fontWeight: 700,

              fontSize: '1rem',

              textDecoration: 'none',

              whiteSpace: 'nowrap',

              transition:
                'all .35s cubic-bezier(.4,0,.2,1)',

              transform: 'translateY(0)',
            }}

            onMouseEnter={(e) => {
              e.currentTarget.style.transform =
                'translateY(-4px) scale(1.03)';

              e.currentTarget.style.background =
                'rgba(255,255,255,0.08)';

              e.currentTarget.style.border =
                '1.5px solid rgba(255,255,255,0.6)';
            }}

            onMouseLeave={(e) => {
              e.currentTarget.style.transform =
                'translateY(0) scale(1)';

              e.currentTarget.style.background =
                'rgba(255,255,255,0.03)';

              e.currentTarget.style.border =
                '1.5px solid rgba(255,255,255,0.35)';
            }}
          >
            ▶ Ver Servicios
          </a>
        </div>
      </div>
      <style>{`
        @keyframes heroShimmer { from { background-position: 0% center; } to { background-position: 200% center; } }
        /* Ken Burns: zoom lentísimo del fondo (solo transform, no afecta LCP ni CLS) */
        @keyframes heroKenBurns {
          from { transform: scale(1); }
          to   { transform: scale(1.1) translate(-1.2%, 1.2%); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .hero-kb { animation: heroKenBurns 18s cubic-bezier(.16,1,.3,1) infinite alternate; will-change: transform; }
        }
        /* Titular palabra por palabra */
        .hero-words-ready .hero-word {
          display: inline-block;
          opacity: 0;
          transform: translateY(.55em) rotate(1.5deg);
          animation: heroWordIn .8s cubic-bezier(.16,1,.3,1) forwards;
        }
        @keyframes heroWordIn { to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .hero-words-ready .hero-word { animation: none; opacity: 1; transform: none; }
        }
        @media (max-width: 640px) {
          .hero-content { padding-top: 5.5rem !important; padding-bottom: 3rem !important; }
          .hero-btns { gap: 0.75rem !important; flex-direction: column !important; align-items: stretch !important; padding: 0 0.5rem; }
          .hero-btns a { padding: 0.875rem 1.5rem !important; font-size: 0.95rem !important; justify-content: center; text-align: center; }
        }
        @media (max-width: 380px) {
          .hero-content { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
        }
      `}</style>
    </section>
  );
}
