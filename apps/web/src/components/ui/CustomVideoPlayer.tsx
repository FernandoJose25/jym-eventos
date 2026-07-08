'use client';
import { useState, useEffect, useRef } from 'react';

// ── CustomVideoPlayer ──────────────────────────────────────────────
const VBTN: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
  width: 36, height: 36, color: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '1rem', flexShrink: 0,
  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
};

function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

function CustomVideoPlayer({ src }: { src: string }) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [playing,     setPlaying]     = useState(false);
  const [muted,       setMuted]       = useState(false);
  const [volume,      setVolume]      = useState(1);
  const [progress,    setProgress]    = useState(0);
  const [cur,         setCur]         = useState(0);
  const [dur,         setDur]         = useState(0);
  const [ctrlVisible, setCtrlVisible] = useState(true);
  const [panel,       setPanel]       = useState<'none'|'vol'|'menu'>('none');
  const [speed,       setSpeed]       = useState(1);
  const [isFull,      setIsFull]      = useState(false);
  const [volRO,       setVolRO]       = useState(false); // iOS: volume read-only

  useEffect(() => {
    const v = videoRef.current; if (!v) return;

    // Detectar iOS Safari donde video.volume es de solo lectura
    try {
      const old = v.volume;
      v.volume = old > 0.5 ? 0.3 : 0.7;
      if (Math.abs(v.volume - (old > 0.5 ? 0.3 : 0.7)) > 0.05) setVolRO(true);
      else v.volume = old;
    } catch { setVolRO(true); }

    v.play().catch(() => {});

    const tick = () => {
      setPlaying(!v.paused);
      setCur(v.currentTime);
      if (v.duration) setProgress((v.currentTime / v.duration) * 100);
    };
    const onMeta  = () => setDur(v.duration);
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

  const seek = (val: number) => {
    const v = videoRef.current; if (!v || !v.duration) return;
    v.currentTime = (val / 100) * v.duration;
    setProgress(val);
  };

  const changeVol = (val: number) => {
    const v = videoRef.current; if (!v) return;
    try { v.volume = val; } catch {}
    v.muted = val === 0;
    setVolume(val); setMuted(val === 0);
  };

  const toggleMute = () => {
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
        position: 'relative', background: '#000', width: '100%',
        borderRadius: isFull ? 0 : 16,
        boxShadow: isFull ? 'none' : '0 32px 80px rgba(0,0,0,0.6)',
      }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        onClick={e => { e.stopPropagation(); if (ctrlVisible) togglePlay(); else bump(); }}
        style={{
          width: '100%', maxHeight: isFull ? '100dvh' : '72vh',
          display: 'block', background: '#000', cursor: 'pointer',
          borderRadius: isFull ? 0 : 16,
        }}
      />

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

          {/* Volumen */}
          <button
            style={{ ...VBTN, background: panel === 'vol' ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.15)' }}
            onClick={e => { e.stopPropagation(); setPanel(p => p === 'vol' ? 'none' : 'vol'); }}>
            {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </button>

          {/* Pantalla completa */}
          <button style={VBTN} onClick={e => { e.stopPropagation(); enterFS(); }}>
            {isFull
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="14" y1="10" x2="21" y2="3"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            }
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

export default CustomVideoPlayer;
