'use client';
import { useEffect, useRef } from 'react';
import VideoSoundControl from '@/components/ui/VideoSoundControl';

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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity .7s ease, transform .7s ease';

    const t = setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 100);

    return () => clearTimeout(t);
  }, []);

  const h1 =
    data.h1 ||
    'Hacemos que cada celebración sea <em style="color:#f5c842;font-style:italic;">Mágica</em>';

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
  const isVideo = data.bgMediaType === 'video';

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
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.72,
            zIndex: 0,
          }}
        >
          {isVideo ? (
            <>
              <video
                key={data.bgImage}
                ref={vidRef}
                autoPlay
                muted
                loop
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: bgPos,
                }}
              >
                <source src={data.bgImage} type="video/mp4" />
              </video>
              {data.bgVideoSound && (
                <VideoSoundControl videoRef={vidRef} position="bottom-right" />
              )}
            </>
          ) : (
            <img
              src={data.bgImage}
              alt=""
              style={{
                width: '100%',
                height: '100%',
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
          style={{
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
