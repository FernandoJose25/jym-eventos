'use client';
import { useState, useEffect, useRef } from 'react';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export default function VideoSoundControl({ videoRef, position = 'bottom-right' }: Props) {
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.6);
  const [showSlider, setShowSlider] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const posStyle: React.CSSProperties = {
    position: 'absolute', zIndex: 10,
    ...(position === 'bottom-right' && { bottom: 12, right: 12 }),
    ...(position === 'bottom-left' && { bottom: 12, left: 12 }),
    ...(position === 'top-right' && { top: 12, right: 12 }),
    ...(position === 'top-left' && { top: 12, left: 12 }),
  };

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowSlider(false), 2400);
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const next = !muted;
    vid.muted = next;
    vid.volume = next ? 0 : volume;
    setMuted(next);
    setShowSlider(!next);
    if (!next) scheduleHide();
  };

  const handleVolume = (v: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    setVolume(v);
    vid.volume = v;
    if (v === 0) { vid.muted = true; setMuted(true); }
    else { vid.muted = false; setMuted(false); }
    scheduleHide();
  };

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  return (
    <div style={posStyle}
      onMouseEnter={() => { ...; setShowSlider(true); }}
      onMouseLeave={() => scheduleHide()}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
        borderRadius: 999, padding: showSlider ? '6px 14px 6px 8px' : '6px 8px',
        border: '1px solid rgba(255,255,255,0.15)',
        transition: 'padding 0.25s ease, width 0.25s ease',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}>
        {/* Botón mute/unmute */}
        <button
          onClick={toggleMute}
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            border: 'none', cursor: 'pointer',
            background: muted ? 'rgba(255,255,255,0.12)' : 'rgba(212,160,23,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.95rem', transition: 'background 0.18s',
          }}
        >
          {muted ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}
        </button>

        {/* Slider de volumen */}
        {showSlider && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            <input
              type="range" min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={e => handleVolume(parseFloat(e.target.value))}
              style={{
                width: 80, accentColor: '#f5c842', cursor: 'pointer',
                height: 4, appearance: 'auto',
              }}
            />
            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', minWidth: 26, textAlign: 'right' }}>
              {muted ? '0%' : `${Math.round(volume * 100)}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
