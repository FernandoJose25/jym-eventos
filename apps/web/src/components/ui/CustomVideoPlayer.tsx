'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cxVideo, cxVideoQuality } from '@/lib/cloudinary';
import { useIsTouchDevice } from '@/lib/hooks/useIsTouchDevice';
import { useZoomPan } from '@/lib/hooks/useZoomPan';

// ── CustomVideoPlayer ──────────────────────────────────────────────
const VBTN: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
  width: 36, height: 36, color: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '1rem', flexShrink: 0,
  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
};

type VideoQuality = 'auto' | 1080 | 720 | 480 | 360;

const QUALITIES: { value: VideoQuality; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 1080,   label: '1080p' },
  { value: 720,    label: '720p' },
  { value: 480,    label: '480p' },
  { value: 360,    label: '360p' },
];

const QUALITY_STORAGE_KEY = 'jm_video_quality';

function loadSavedQuality(): VideoQuality {
  if (typeof window === 'undefined') return 'auto';
  try {
    const saved = window.localStorage.getItem(QUALITY_STORAGE_KEY);
    if (!saved || saved === 'auto') return 'auto';
    const n = Number(saved);
    return ([1080, 720, 480, 360] as number[]).includes(n) ? (n as VideoQuality) : 'auto';
  } catch { return 'auto'; }
}

function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

/**
 * `src` debe ser la URL CRUDA de Cloudinary (sin transformar) — este
 * componente arma la URL final según la calidad elegida por el usuario.
 * `sonidoPermitido` (default false): si es false, el video se reproduce
 * SIEMPRE muteado y el control de volumen queda deshabilitado — el
 * visitante no puede activar el sonido bajo ninguna circunstancia (para
 * videos con conversaciones/audio que no se quiere hacer público).
 */
function CustomVideoPlayer({ src, sonidoPermitido = false, fullBleed = false, onZoomChange }: { src: string; sonidoPermitido?: boolean; fullBleed?: boolean; onZoomChange?: (zoomed: boolean) => void }) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const mediaBoxRef = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Aspect ratio real del archivo (ancho/alto) — se usa para que la caja que
  // recibe el pinch-zoom calce EXACTO con el contenido visual del video, sin
  // las barras negras que deja `object-fit:contain` cuando el elemento no
  // comparte el aspect ratio del video. Sin esto, useZoomPan calcula pan/zoom
  // sobre una caja que incluye esas barras negras: el usuario ve márgenes
  // negros al hacer zoom y puede arrastrar hacia esas zonas vacías.
  const [videoAspect, setVideoAspect] = useState<number | null>(null);

  const [playing,     setPlaying]     = useState(false);
  const [muted,       setMuted]       = useState(!sonidoPermitido);
  const [volume,      setVolume]      = useState(1);
  const [progress,    setProgress]    = useState(0);
  const [cur,         setCur]         = useState(0);
  const [dur,         setDur]         = useState(0);
  const [ctrlVisible, setCtrlVisible] = useState(true);
  const [panel,       setPanel]       = useState<'none'|'vol'|'menu'|'calidad'>('none');
  const [speed,       setSpeed]       = useState(1);
  const [isFull,      setIsFull]      = useState(false);
  const [volRO,       setVolRO]       = useState(false); // iOS: volume read-only
  const [quality,     setQuality]     = useState<VideoQuality>(loadSavedQuality);
  const [nativeHeight, setNativeHeight] = useState<number | null>(null);

  const resumeRef     = useRef<{ time: number; wasPlaying: boolean } | null>(null);
  const skipNextResume = useRef(true); // no restaurar posición en el primer render

  // Gestos táctiles (solo mobile): pinch-zoom persistente + doble-tap lateral
  const isTouch = useIsTouchDevice();
  const { scale, x: panX, y: panY, isZoomed, handlers: zoomHandlers } = useZoomPan(mediaBoxRef);
  // El pinch-zoom solo debe activarse una vez que conocemos el aspect ratio
  // real (fullBleed) o al menos ya cargó metadata — si el usuario pellizca
  // antes de eso, useZoomPan mide con getBoundingClientRect() una caja que
  // aún no tiene su tamaño/aspect-ratio final, y calcula límites de pan
  // incorrectos (se queda "pegado" en un zoom que ya no se puede deshacer).
  const gestosListos = fullBleed ? videoAspect !== null : dur > 0;
  // El padre (lightbox de galería) usa esto para bloquear su swipe de
  // navegación mientras el video está en zoom — sin esto, el swipe entre
  // fotos/videos no sabe que hay un zoom de VIDEO activo (solo conoce el
  // zoom de imágenes, que vive en un useZoomPan distinto) y puede cambiar
  // de slide en medio de un gesto de pan sobre el video ampliado.
  useEffect(() => {
    onZoomChange?.(isZoomed);
    return () => onZoomChange?.(false);
  }, [isZoomed, onZoomChange]);
  const [skipFeedback, setSkipFeedback] = useState<{ side: 'left' | 'right'; key: number } | null>(null);
  const lastVideoTapRef = useRef<{ time: number; x: number } | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const computedSrc = useMemo(
    () => (quality === 'auto' ? cxVideo(src) : cxVideoQuality(src, quality)),
    [src, quality]
  );

  // Consulta la resolución real del video original en Cloudinary para no
  // mostrar opciones de calidad más altas de las que el archivo realmente
  // tiene (ej. no mostrar "1080p" si se subió en 480p — Cloudinary solo
  // puede reducir la imagen, no inventar resolución que no existe).
  useEffect(() => {
    let cancelado = false;
    setNativeHeight(null);
    fetch(`/api/video-meta?url=${encodeURIComponent(src)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelado && data?.height) setNativeHeight(data.height); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [src]);

  // Un 10% de margen porque la resolución real de un archivo (ej. 718px) no
  // siempre calza exacto con los escalones estándar (720p, 480p...).
  const qualitiesDisponibles = useMemo(() => {
    if (!nativeHeight) return QUALITIES; // sin metadata aún → no restringir, se ve todo
    return QUALITIES.filter(q => q.value === 'auto' || (q.value as number) <= nativeHeight * 1.1);
  }, [nativeHeight]);

  // Si la calidad guardada de una sesión anterior ya no es válida para este
  // video (por ejemplo, el usuario había elegido 1080p viendo otro video de
  // mayor resolución), la bajamos a 'auto' automáticamente.
  useEffect(() => {
    if (nativeHeight && quality !== 'auto' && (quality as number) > nativeHeight * 1.1) {
      setQuality('auto');
    }
  }, [nativeHeight, quality]);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;

    if (!sonidoPermitido) {
      v.muted = true;
    } else {
      // Detectar iOS Safari donde video.volume es de solo lectura
      try {
        const old = v.volume;
        v.volume = old > 0.5 ? 0.3 : 0.7;
        if (Math.abs(v.volume - (old > 0.5 ? 0.3 : 0.7)) > 0.05) setVolRO(true);
        else v.volume = old;
      } catch { setVolRO(true); }
    }

    v.play().catch(() => {});

    const tick = () => {
      setPlaying(!v.paused);
      setCur(v.currentTime);
      if (v.duration) setProgress((v.currentTime / v.duration) * 100);
    };
    const onMeta  = () => {
      setDur(v.duration);
      if (v.videoWidth && v.videoHeight) setVideoAspect(v.videoWidth / v.videoHeight);
    };
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onFs    = () => setIsFull(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));

    v.addEventListener('timeupdate',     tick);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('durationchange', onMeta);
    v.addEventListener('play',           onPlay);
    v.addEventListener('pause',          onPause);
    document.addEventListener('fullscreenchange',       onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      v.removeEventListener('timeupdate',     tick);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('durationchange', onMeta);
      v.removeEventListener('play',           onPlay);
      v.removeEventListener('pause',          onPause);
      document.removeEventListener('fullscreenchange',       onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
      clearTimeout(timerRef.current);
      clearTimeout(singleTapTimerRef.current);
    };
  }, []);

  // Reiniciar el temporizador de ocultado cada vez que cambia el panel
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (panel !== 'none') {
      // Panel abierto → controles siempre visibles, sin temporizador
      setCtrlVisible(true);
    }
  }, [panel]);

  // Al cambiar de calidad, el <video src> cambia y el navegador recarga el
  // archivo desde cero — este efecto restaura el punto exacto donde iba y,
  // si estaba reproduciendo, retoma la reproducción automáticamente.
  useEffect(() => {
    if (skipNextResume.current) { skipNextResume.current = false; return; }
    const v = videoRef.current; if (!v) return;
    const onLoaded = () => {
      if (resumeRef.current) {
        v.currentTime = resumeRef.current.time;
        if (resumeRef.current.wasPlaying) v.play().catch(() => {});
        resumeRef.current = null;
      }
      v.removeEventListener('loadedmetadata', onLoaded);
    };
    v.addEventListener('loadedmetadata', onLoaded);
    return () => v.removeEventListener('loadedmetadata', onLoaded);
  }, [computedSrc]);

  const changeQuality = (q: VideoQuality) => {
    const v = videoRef.current;
    if (v) resumeRef.current = { time: v.currentTime, wasPlaying: !v.paused };
    setQuality(q);
    setPanel('none');
    try { window.localStorage.setItem(QUALITY_STORAGE_KEY, String(q)); } catch {}
  };

  const bump = () => {
    setCtrlVisible(true);
    clearTimeout(timerRef.current);
    // Solo auto-ocultar si no hay panel abierto — leer del estado directamente
    // via un setState funcional para tener el valor actual sin closure stale
    setPanel(p => {
      if (p === 'none') {
        timerRef.current = setTimeout(() => setCtrlVisible(false), 4000);
      }
      return p; // no cambiar el panel
    });
  };

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) v.play(); else v.pause();
    bump();
  };

  const skip = (delta: number, side: 'left' | 'right') => {
    const v = videoRef.current; if (!v || !v.duration) return;
    v.currentTime = Math.min(Math.max(v.currentTime + delta, 0), v.duration);
    setSkipFeedback({ side, key: Date.now() });
    bump();
  };

  // Doble-tap lateral (solo mobile, solo si no hay zoom activo): tap derecho
  // = +5s, tap izquierdo = -5s. Un solo tap conserva el comportamiento
  // original (togglePlay/bump), con un pequeño delay para poder distinguirlo
  // de un doble-tap.
  const handleVideoTouchEnd = (e: React.TouchEvent) => {
    if (isZoomed) return; // en zoom, el doble-tap lo maneja useZoomPan (reset)
    const t = e.changedTouches[0]; if (!t) return;
    const now = Date.now();
    const last = lastVideoTapRef.current;
    const isDouble = !!last && (now - last.time) < 300 && Math.abs(t.clientX - last.x) < 40;

    if (isDouble) {
      clearTimeout(singleTapTimerRef.current);
      lastVideoTapRef.current = null;
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isRight = (t.clientX - rect.left) > rect.width / 2;
      skip(isRight ? 5 : -5, isRight ? 'right' : 'left');
    } else {
      lastVideoTapRef.current = { time: now, x: t.clientX };
      singleTapTimerRef.current = setTimeout(() => {
        if (ctrlVisible) togglePlay(); else bump();
        lastVideoTapRef.current = null;
      }, 300);
    }
  };

  const seek = (val: number) => {
    const v = videoRef.current; if (!v || !v.duration) return;
    v.currentTime = (val / 100) * v.duration;
    setProgress(val);
  };

  const changeVol = (val: number) => {
    if (!sonidoPermitido) return;
    const v = videoRef.current; if (!v) return;
    try { v.volume = val; } catch {}
    v.muted = val === 0;
    setVolume(val); setMuted(val === 0);
  };

  const toggleMute = () => {
    if (!sonidoPermitido) return;
    const v = videoRef.current; if (!v) return;
    v.muted = !v.muted; setMuted(v.muted);
  };

  const enterFS = async () => {
    const el = wrapRef.current; const v = videoRef.current; if (!el || !v) return;
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (el.requestFullscreen)                        await el.requestFullscreen();
        else if ((el as any).webkitRequestFullscreen)    (el as any).webkitRequestFullscreen();
        else if ((v  as any).webkitEnterFullscreen)      (v  as any).webkitEnterFullscreen();
      } else {
        if (document.exitFullscreen)                     await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
      }
    } catch {}
  };

  const applySpeed = (s: number) => {
    const v = videoRef.current; if (!v) return;
    v.playbackRate = s; setSpeed(s); setPanel('none');
  };

  const tryPiP = async () => {
    const v = videoRef.current; if (!v) return;
    try {
      if ((document as any).pictureInPictureElement) await (document as any).exitPictureInPicture();
      else if (v.requestPictureInPicture)             await v.requestPictureInPicture();
    } catch {}
    setPanel('none');
  };

  // Evitar que clicks dentro del player cierren el lightbox
  const sp = (e: React.MouseEvent | React.TouchEvent) => e.stopPropagation();

  return (
    <div
      ref={wrapRef}
      onClick={sp}
      onMouseMove={bump}
      style={{
        position: 'relative', background: '#000',
        width: '100%', height: fullBleed ? '100%' : undefined,
        overflow: 'hidden',
        display: fullBleed ? 'flex' : undefined,
        alignItems: fullBleed ? 'center' : undefined,
        justifyContent: fullBleed ? 'center' : undefined,
        borderRadius: isFull || fullBleed ? 0 : 16,
        boxShadow: isFull || fullBleed ? 'none' : '0 32px 80px rgba(0,0,0,0.6)',
      }}
    >
      {/* Caja de medio: en fullBleed, su tamaño calza EXACTO con el aspect
          ratio real del video (via aspect-ratio) para que no queden barras
          negras propias dentro de la caja que recibe el pinch-zoom — así
          useZoomPan calcula pan/límites sobre el contenido visual real, no
          sobre espacio vacío. */}
      <motion.div
        ref={mediaBoxRef}
        {...(isTouch && gestosListos ? {
          onTouchStart: (e: React.TouchEvent) => { sp(e); zoomHandlers.onTouchStart(e); },
          onTouchMove: (e: React.TouchEvent) => { sp(e); zoomHandlers.onTouchMove(e); },
          onTouchEnd: (e: React.TouchEvent) => { sp(e); zoomHandlers.onTouchEnd(e); handleVideoTouchEnd(e); },
        } : isTouch ? {
          onTouchEnd: (e: React.TouchEvent) => { sp(e); handleVideoTouchEnd(e); },
        } : {})}
        style={fullBleed ? {
          position: 'relative',
          width: videoAspect ? 'auto' : '100%',
          height: '100%',
          maxWidth: '100%',
          aspectRatio: videoAspect ?? undefined,
          scale, x: panX, y: panY,
          touchAction: isTouch && gestosListos ? 'none' : 'auto',
        } : {
          position: 'relative', width: '100%',
          scale, x: panX, y: panY,
          touchAction: isTouch && gestosListos ? 'none' : 'auto',
        }}
      >
        <video
          ref={videoRef}
          src={computedSrc}
          autoPlay
          playsInline
          muted={!sonidoPermitido}
          onClick={e => {
            if (isTouch) return; // en touch, el gesto se resuelve en onTouchEnd
            e.stopPropagation();
            if (ctrlVisible) togglePlay(); else bump();
          }}
          style={fullBleed ? {
            // Sin objectFit aquí: el contenedor (mediaBoxRef) ya calza EXACTO
            // con el aspect ratio real vía `aspectRatio: videoAspect` — un
            // segundo `contain` en el <video> es redundante y, si videoAspect
            // difiere aunque sea levemente del render real (redondeo,
            // metadata de rotación en video vertical), añade una SEGUNDA capa
            // de letterboxing dentro de la primera: de ahí las barras negras
            // y el "se ve más grande de lo que debería" pese a scale=1.
            width: '100%', height: '100%', display: 'block',
            background: '#000', cursor: 'pointer',
            objectFit: videoAspect ? undefined : 'contain',
          } : {
            width: '100%', maxHeight: isFull ? '100dvh' : '72vh',
            display: 'block', background: '#000', cursor: 'pointer',
            objectFit: 'contain',
            borderRadius: isFull ? 0 : 16,
          }}
        />
      </motion.div>

      {/* Feedback de doble-tap: ⏩/⏪ 5s */}
      {isTouch && (
        <AnimatePresence>
          {skipFeedback && (
            <SkipFeedback key={skipFeedback.key} side={skipFeedback.side} onDone={() => setSkipFeedback(null)} />
          )}
        </AnimatePresence>
      )}

      {/* Barra de controles — siempre renderizada, visibilidad por opacity */}
      <div
        onClick={sp}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.92))',
          padding: '40px 12px 12px',
          borderRadius: isFull ? 0 : '0 0 16px 16px',
          opacity: ctrlVisible ? 1 : 0,
          transition: 'opacity 0.3s',
          pointerEvents: ctrlVisible ? 'auto' : 'none',
        }}
      >
        {/* ── Panel: Volumen ── */}
        {panel === 'vol' && (
          <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(0,0,0,0.55)', borderRadius: 10 }}>
            {volRO ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button style={VBTN} onClick={e => { e.stopPropagation(); toggleMute(); }}>
                  {muted ? '🔇' : '🔊'}
                </button>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem' }}>
                  Usa los botones físicos del dispositivo para ajustar el volumen
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button style={{ ...VBTN, width: 32, height: 32 }} onClick={e => { e.stopPropagation(); toggleMute(); }}>
                  {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </button>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={muted ? 0 : volume}
                  onChange={e => changeVol(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#f5c842', cursor: 'pointer', touchAction: 'none' }}
                />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', minWidth: 34, textAlign: 'right' }}>
                  {muted ? '0%' : `${Math.round(volume * 100)}%`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Panel: Menú ── */}
        {panel === 'menu' && (
          <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(0,0,0,0.55)', borderRadius: 10 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.1em' }}>
              Velocidad
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                <button key={s}
                  onClick={e => { e.stopPropagation(); applySpeed(s); }}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: speed === s ? 'rgba(212,160,23,0.9)' : 'rgba(255,255,255,0.13)',
                    color: speed === s ? '#0a1628' : '#fff',
                    fontWeight: speed === s ? 700 : 400, fontSize: '0.8rem',
                    WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                  }}>
                  {s === 1 ? '1×  Normal' : `${s}×`}
                </button>
              ))}
            </div>
            <button
              onClick={e => { e.stopPropagation(); tryPiP(); }}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.13)', color: '#fff', fontSize: '0.8rem',
                WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              }}>
              📺 Picture in Picture
            </button>
          </div>
        )}

        {/* ── Panel: Calidad ── */}
        {panel === 'calidad' && (
          <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(0,0,0,0.55)', borderRadius: 10 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.1em' }}>
              Calidad de video
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {qualitiesDisponibles.map(q => (
                <button key={q.value}
                  onClick={e => { e.stopPropagation(); changeQuality(q.value); }}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: quality === q.value ? 'rgba(212,160,23,0.9)' : 'rgba(255,255,255,0.13)',
                    color: quality === q.value ? '#0a1628' : '#fff',
                    fontWeight: quality === q.value ? 700 : 400, fontSize: '0.8rem',
                    WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                  }}>
                  {q.label}
                </button>
              ))}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.62rem', margin: '8px 0 0' }}>
              {nativeHeight && qualitiesDisponibles.length < QUALITIES.length
                ? `Este video es de ${nativeHeight}p — no se muestran calidades mayores porque no existen en el archivo original`
                : 'Elige una calidad menor si tu conexión es lenta o tienes datos limitados'}
            </p>
          </div>
        )}

        {/* ── Seek bar ── */}
        <input
          type="range" min={0} max={100} step={0.1}
          value={progress}
          onChange={e => seek(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#f5c842', cursor: 'pointer', marginBottom: 10, display: 'block', touchAction: 'none' }}
        />

        {/* ── Fila de botones ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          <button style={VBTN} onClick={e => { e.stopPropagation(); togglePlay(); }}>
            {playing ? '⏸' : '▶'}
          </button>

          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.7rem', flexShrink: 0, minWidth: 72 }}>
            {fmtTime(cur)} / {fmtTime(dur)}
          </span>

          <div style={{ flex: 1 }} />

          {/* Volumen — deshabilitado por completo si no se permite sonido */}
          <button
            style={{
              ...VBTN,
              background: panel === 'vol' ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.15)',
              opacity: sonidoPermitido ? 1 : 0.4,
              cursor: sonidoPermitido ? 'pointer' : 'not-allowed',
            }}
            title={sonidoPermitido ? undefined : 'Este video no tiene sonido disponible'}
            onClick={e => {
              e.stopPropagation();
              if (!sonidoPermitido) return;
              setPanel(p => p === 'vol' ? 'none' : 'vol');
            }}>
            {!sonidoPermitido || muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </button>

          {/* Pantalla completa */}
          <button style={VBTN} onClick={e => { e.stopPropagation(); enterFS(); }}>
            {isFull
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="14" y1="10" x2="21" y2="3"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            }
          </button>

          {/* Calidad de video */}
          <button
            style={{ ...VBTN, background: panel === 'calidad' ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.15)' }}
            onClick={e => { e.stopPropagation(); setPanel(p => p === 'calidad' ? 'none' : 'calidad'); }}
            aria-label="Calidad de video">
            ⚙️
          </button>

          {/* Menú 3 puntos */}
          <button
            style={{ ...VBTN, fontSize: '1.3rem', background: panel === 'menu' ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.15)' }}
            onClick={e => { e.stopPropagation(); setPanel(p => p === 'menu' ? 'none' : 'menu'); }}>
            ⋮
          </button>

        </div>
      </div>
    </div>
  );
}

// Feedback visual del doble-tap lateral (⏩ 5s / ⏪ 5s), auto-desaparece.
function SkipFeedback({ side, onDone }: { side: 'left' | 'right'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'absolute', top: 0, bottom: 0,
        [side]: 0, width: '40%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 3,
      }}
    >
      <div style={{
        background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: 68, height: 68,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <span style={{ fontSize: '1.3rem' }}>{side === 'right' ? '⏩' : '⏪'}</span>
        <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>5s</span>
      </div>
    </motion.div>
  );
}

export default CustomVideoPlayer;
