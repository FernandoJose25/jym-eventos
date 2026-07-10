'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, X } from 'lucide-react';
import { cxCard, cxFull, cxVideo, cxShareVideo, cxVideoQuality, type VideoQuality } from '@/lib/cloudinary';
import { ShareBar } from '@/components/ui/ShareBar';
import CapybaraLoader from '@/components/ui/CapybaraLoader';

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

function CustomVideoPlayer({ rawUrl }: { rawUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [ctrlVisible, setCtrlVisible] = useState(true);
  const [panel, setPanel] = useState<'none' | 'vol' | 'menu'>('none');
  const [speed, setSpeed] = useState(1);
  const [isFull, setIsFull] = useState(false);
  const [volRO, setVolRO] = useState(false); // iOS: volume read-only

  // Calidad de video — se recuerda entre sesiones (localStorage) para que
  // el usuario no tenga que reconfigurarla en cada video.
  const [quality, setQuality] = useState<VideoQuality>('auto');
  useEffect(() => {
    const saved = localStorage.getItem('jym_video_quality') as VideoQuality | null;
    if (saved) setQuality(saved);
  }, []);
  const src = cxVideoQuality(rawUrl, quality);

  function changeQuality(next: VideoQuality) {
    const v = videoRef.current;
    const resumeAt = v?.currentTime ?? 0;
    const wasPlaying = v ? !v.paused : true;
    setQuality(next);
    localStorage.setItem('jym_video_quality', next);
    // Al cambiar `src` el <video> se recarga desde 0 — restauramos el punto
    // exacto donde iba para que no sienta que "perdió" su lugar en el video.
    requestAnimationFrame(() => {
      const v2 = videoRef.current;
      if (!v2) return;
      const onReady = () => {
        v2.currentTime = resumeAt;
        if (wasPlaying) v2.play().catch(() => { });
        v2.removeEventListener('loadedmetadata', onReady);
      };
      v2.addEventListener('loadedmetadata', onReady);
    });
  }

  useEffect(() => {
    const v = videoRef.current; if (!v) return;

    // Detectar iOS Safari donde video.volume es de solo lectura
    try {
      const old = v.volume;
      v.volume = old > 0.5 ? 0.3 : 0.7;
      if (Math.abs(v.volume - (old > 0.5 ? 0.3 : 0.7)) > 0.05) setVolRO(true);
      else v.volume = old;
    } catch { setVolRO(true); }

    v.play().catch(() => { });

    const tick = () => {
      setPlaying(!v.paused);
      setCur(v.currentTime);
      if (v.duration) setProgress((v.currentTime / v.duration) * 100);
    };
    const onMeta = () => setDur(v.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onFs = () => setIsFull(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));

    v.addEventListener('timeupdate', tick);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('durationchange', onMeta);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      v.removeEventListener('timeupdate', tick);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('durationchange', onMeta);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      document.removeEventListener('fullscreenchange', onFs);
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
    try { v.volume = val; } catch { }
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
        if (el.requestFullscreen) await el.requestFullscreen();
        else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
        else if ((v as any).webkitEnterFullscreen) (v as any).webkitEnterFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
      }
    } catch { }
  };

  const applySpeed = (s: number) => {
    const v = videoRef.current; if (!v) return;
    v.playbackRate = s; setSpeed(s); setPanel('none');
  };

  const tryPiP = async () => {
    const v = videoRef.current; if (!v) return;
    try {
      if ((document as any).pictureInPictureElement) await (document as any).exitPictureInPicture();
      else if (v.requestPictureInPicture) await v.requestPictureInPicture();
    } catch { }
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

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', margin: '12px 0 8px', textTransform: 'uppercase', letterSpacing: '.1em' }}>
              Calidad de video
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {([
                { v: 'auto', label: 'Automática', hint: 'Se ajusta a tu conexión' },
                { v: '1080p', label: '1080p', hint: 'Máxima calidad' },
                { v: '720p', label: '720p', hint: 'Balance' },
                { v: '480p', label: '480p', hint: 'Ahorra datos' },
              ] as const).map(opt => (
                <button key={opt.v}
                  onClick={e => { e.stopPropagation(); changeQuality(opt.v); }}
                  title={opt.hint}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: quality === opt.v ? 'rgba(212,160,23,0.9)' : 'rgba(255,255,255,0.13)',
                    color: quality === opt.v ? '#0a1628' : '#fff',
                    fontWeight: quality === opt.v ? 700 : 400, fontSize: '0.8rem',
                    WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
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
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="10" y1="14" x2="3" y2="21" /><line x1="14" y1="10" x2="21" y2="3" /></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
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

interface GItem {
  id: string; url: string; alt: string;
  categoria?: string; subcategoria?: string;
  visible: boolean; order: number;
  focalX?: number; focalY?: number;
  tipo?: string;
  // `albumId` referencia la colección `albums` (id real del documento, no
  // un slug de texto) — se usa para armar cada álbum en /albumes/[slug].
  albumId?: string;
}

const CAT_ICONS: Record<string, string> = {
  'Todos': '🎪',
  'Shows Infantiles': '🎭',
  'Show Hora Loca': '🎉',
  'Activaciones Empresariales': '🏢',
  'Decoración Temática': '🎨',
  'Fotografía': '📸',
  'Filmación y Fotografía': '📸',
  'Catering': '🍽️',
  'Catering y Carritos Snacks': '🍽️',
  'General': '🖼️',
};

const isVideo = (item: GItem) =>
  item.tipo === 'video' || !!item.url?.match(/\.(mp4|webm|mov)(\?|$)/i);

// Smart search: score items by query relevance
function smartSearch(items: GItem[], q: string): { results: GItem[]; suggestions: string[] } {
  if (!q.trim()) return { results: items, suggestions: [] };
  const ql = q.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = items.map(item => {
    let s = 0;
    const fields = [
      { v: item.alt, w: 3 },
      { v: item.categoria, w: 2 },
      { v: item.subcategoria, w: 2 },
    ];
    for (const { v, w } of fields) {
      if (!v) continue;
      const t = v.toLowerCase();
      for (const word of ql) s += (t.split(word).length - 1) * w;
    }
    return { item, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.item);

  if (scored.length > 0) return { results: scored, suggestions: [] };

  // No match → gather suggestion tokens from all items
  const tokens = new Set<string>();
  for (const item of items) {
    if (item.categoria) tokens.add(item.categoria);
    if (item.subcategoria) tokens.add(item.subcategoria);
    (item.alt || '').split(/\s+/).forEach(w => w.length > 3 && tokens.add(w));
  }
  const first = ql[0]?.[0] ?? '';
  const suggestions = [...tokens]
    .filter(t => t.toLowerCase().startsWith(first) || ql.some(w => t.toLowerCase().includes(w[0] ?? '')))
    .slice(0, 6);

  return { results: [], suggestions };
}

export default function GaleriaClient() {
  const [items, setItems] = useState<GItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [catActiva, setCatActiva] = useState('Todos');
  const [subActiva, setSubActiva] = useState('Todos');
  const [searchQ, setSearchQ] = useState('');
  const PAGE_SIZE = 24;
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const autoOpened = useRef(false);

  useEffect(() => {
    const CACHE_KEY = 'jym_gallery_cache_v1';

    // 1) Stale-while-revalidate: si hay caché (aunque esté vencido), lo
    //    pintamos YA — la web se siente instantánea en visitas repetidas.
    //    Luego, siempre revalidamos contra Firestore en segundo plano.
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { items: cached } = JSON.parse(raw);
        if (Array.isArray(cached) && cached.length) {
          setItems(cached);
          setLoading(false);
        }
      }
    } catch { /* localStorage no disponible o corrupto: seguimos sin caché */ }

    getDocs(query(collection(db, 'gallery_items'), orderBy('order', 'asc')))
      .then(snap => {
        const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((i: any) => i.visible !== false) as GItem[];
        setItems(fresh);
        setLoading(false);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ items: fresh, ts: Date.now() }));
        } catch { /* cuota de localStorage llena: no es crítico, seguimos sin cachear */ }
      });
  }, []);

  useEffect(() => { setSubActiva('Todos'); setSearchQ(''); }, [catActiva]);

  // Pipeline: category → subcategory → search
  const catFiltered = catActiva === 'Todos' ? items : items.filter(i => i.categoria === catActiva);

  // Deduplicate subcategories: normalize to "Primera letra mayúscula, resto minúscula"
  // so "PROMOCIONES", "PROmociones", "promociones" → "Promociones"
  const toDisplay = (s: string) => {
    const t = s.trim();
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  };

  const subcats = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of catFiltered) {
      if (!item.subcategoria) continue;
      const display = toDisplay(item.subcategoria);
      if (!seen.has(display)) { seen.add(display); result.push(display); }
    }
    return ['Todos', ...result];
  }, [catFiltered]);

  // Match using same normalization so "PROMOCIONES" in Firestore matches pill "Promociones"
  const subFiltered = subActiva === 'Todos'
    ? catFiltered
    : catFiltered.filter(i => i.subcategoria && toDisplay(i.subcategoria) === subActiva);

  const { results: visibles, suggestions } = useMemo(
    () => smartSearch(subFiltered, searchQ),
    [subFiltered, searchQ]
  );

  // Auto-open lightbox when URL contains ?foto=ID (deep link from share)
  useEffect(() => {
    if (autoOpened.current || visibles.length === 0) return;
    const fotoId = new URLSearchParams(window.location.search).get('foto');
    if (!fotoId) return;
    const idx = visibles.findIndex(i => i.id === fotoId);
    if (idx !== -1) { autoOpened.current = true; setLightbox(idx); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibles]);

  // Build category list dynamically from loaded items
  const cats = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; icon: string }[] = [];
    for (const item of items) {
      if (item.categoria && !seen.has(item.categoria)) {
        seen.add(item.categoria);
        result.push({ id: item.categoria, icon: CAT_ICONS[item.categoria] ?? '✨' });
      }
    }
    return [{ id: 'Todos', icon: '🎪' }, ...result];
  }, [items]);

  const haySubs = catActiva !== 'Todos' && subcats.length > 1;

  // Lightbox keyboard
  useEffect(() => {
    if (lightbox === null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox(p => ((p! + 1) % visibles.length));
      if (e.key === 'ArrowLeft') setLightbox(p => ((p! - 1 + visibles.length) % visibles.length));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [lightbox, visibles.length]);

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [catActiva, subActiva, searchQ]);

  return (
    <>
      {/* Hero */}
      <section style={{
        paddingTop: '8rem', paddingBottom: '4rem',
        background: 'linear-gradient(135deg,#050d1a 0%,#0a1628 50%,#1e3a5f 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {[600, 400, 240].map(s => (
          <div key={s} style={{
            position: 'absolute', top: '50%', left: '50%', width: s, height: s,
            borderRadius: '50%', border: '1px solid rgba(212,160,23,0.07)',
            transform: 'translate(-50%,-50%)', pointerEvents: 'none'
          }} />
        ))}
        <div className="container" style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <nav style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: 16 }}>
            <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Inicio</a>{' / '}
            <span style={{ color: 'rgba(255,255,255,.75)' }}>Galería</span>
          </nav>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: '1rem',
            padding: '0.35rem 1.25rem', borderRadius: 9999,
            background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)',
            color: '#f5c842', fontSize: '0.72rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.12em'
          }}>
            📸 Momentos Mágicos
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem,5vw,3.5rem)', marginBottom: '1rem' }}>
            Galería de <em>Eventos</em>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', maxWidth: 560, margin: '0 auto' }}>
            Descubre la alegría, los colores y la magia que vivimos en cada celebración que organizamos.
          </p>
        </div>
      </section>

      {/* Filtros + búsqueda */}
      <section style={{
        background: '#f8fafc', padding: '1.5rem 0 0', position: 'sticky', top: 72, zIndex: 50,
        borderBottom: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(10,22,40,0.06)'
      }}>
        <div className="container">

          {/* Barra de búsqueda */}
          <div style={{ position: 'relative', maxWidth: 520, marginBottom: '1rem' }}>
            <Search size={16} style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', pointerEvents: 'none'
            }} />
            <input
              ref={searchRef}
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Buscar por temática, categoría, descripción…"
              style={{
                width: '100%', padding: '0.65rem 2.5rem 0.65rem 2.6rem',
                borderRadius: 9999, border: '2px solid #e2e8f0', outline: 'none',
                fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem', color: '#0a1628',
                background: '#fff', boxSizing: 'border-box', transition: 'border-color .2s',
                boxShadow: '0 1px 6px rgba(10,22,40,0.06)',
              }}
              onFocus={e => (e.target.style.borderColor = '#d4a017')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
            {searchQ && (
              <button onClick={() => setSearchQ('')}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                  display: 'flex', padding: 4
                }}>
                <X size={15} />
              </button>
            )}
          </div>

          {/* Categorías principales */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: '1rem', flexWrap: 'wrap' }}>
            {cats.map(cat => {
              const count = cat.id === 'Todos' ? items.length : items.filter(i => i.categoria === cat.id).length;
              if (cat.id !== 'Todos' && count === 0) return null;
              const active = catActiva === cat.id;
              return (
                <button key={cat.id} onClick={() => setCatActiva(cat.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 1.25rem',
                    borderRadius: 9999, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-jakarta)', fontWeight: active ? 700 : 500, fontSize: '0.88rem',
                    transition: 'all .25s',
                    background: active ? 'linear-gradient(135deg,#0a1628,#1e3a5f)' : '#fff',
                    color: active ? '#fff' : '#475569',
                    boxShadow: active ? '0 4px 16px rgba(10,22,40,0.25)' : '0 1px 4px rgba(10,22,40,0.08)',
                    transform: active ? 'translateY(-2px)' : 'translateY(0)',
                  }}>
                  <span>{cat.icon}</span>
                  <span>{cat.id}</span>
                  {count > 0 && (
                    <span style={{
                      fontSize: '0.68rem', padding: '1px 7px', borderRadius: 999,
                      background: active ? 'rgba(212,160,23,0.3)' : 'rgba(10,22,40,0.08)',
                      color: active ? '#f5c842' : '#94a3b8', fontWeight: 700
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Subcategorías */}
          {haySubs && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: '1rem', flexWrap: 'wrap' }}>
              <p style={{
                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em',
                color: '#94a3b8', margin: 'auto 8px auto 0', flexShrink: 0
              }}>
                Subcategoría:
              </p>
              {subcats.map(sub => {
                const activeSub = subActiva === sub;
                return (
                  <button key={sub} onClick={() => setSubActiva(sub)}
                    style={{
                      padding: '0.4rem 1rem', borderRadius: 9999, cursor: 'pointer', fontSize: '0.82rem',
                      fontFamily: 'var(--font-jakarta)', fontWeight: activeSub ? 600 : 400,
                      border: activeSub ? '2px solid #d4a017' : '1.5px solid #e2e8f0',
                      background: activeSub ? 'rgba(212,160,23,0.1)' : '#fff',
                      color: activeSub ? '#b8860b' : '#64748b', transition: 'all .2s',
                    }}>
                    {sub}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Grid */}
      <section style={{ padding: '3rem 0 5rem', background: '#f8fafc', minHeight: '60vh' }}>
        <div className="container">
          {loading ? (
            <div style={{ columns: '3 220px', gap: '1rem' }}>
              {[...Array(12)].map((_, i) => (
                <div key={i} className="skeleton" style={{
                  breakInside: 'avoid', marginBottom: '1rem',
                  height: i % 3 === 0 ? 280 : i % 3 === 1 ? 220 : 260, borderRadius: 14
                }} />
              ))}
            </div>
          ) : visibles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', maxWidth: 520, margin: '0 auto' }}>
              <p style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</p>
              {searchQ ? (
                <>
                  <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: suggestions.length ? 16 : 0 }}>
                    No encontramos resultados para <strong>"{searchQ}"</strong>
                  </p>
                  {suggestions.length > 0 && (
                    <div>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 10 }}>¿Quisiste decir…?</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {suggestions.map(s => (
                          <button key={s} onClick={() => setSearchQ(s)}
                            style={{
                              padding: '0.4rem 1.1rem', borderRadius: 9999,
                              border: '2px solid #d4a017', background: 'rgba(212,160,23,0.08)',
                              color: '#b8860b', fontFamily: 'var(--font-jakarta)',
                              fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600,
                              transition: 'background .2s'
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,0.18)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,0.08)'}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: '#64748b', fontSize: '1rem' }}>No hay contenido en esta categoría aún.</p>
              )}
            </div>
          ) : (
            <>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '1.5rem', textAlign: 'right' }}>
                {visibles.length} elemento{visibles.length !== 1 ? 's' : ''} encontrado{visibles.length !== 1 ? 's' : ''}
                {catActiva !== 'Todos' && ` en "${catActiva}"`}
                {subActiva !== 'Todos' && ` › "${subActiva}"`}
                {searchQ && ` · búsqueda: "${searchQ}"`}
              </p>

              {/* Masonry */}
              <div style={{ columns: '3 220px', gap: '1.25rem' }}>
                {visibles.slice(0, visibleLimit).map((item, i) => {
                  const fp = `${(item.focalX ?? 0.5) * 100}% ${(item.focalY ?? 0.5) * 100}%`;
                  const vid = isVideo(item);
                  return (
                    <div key={item.id}
                      onClick={() => setLightbox(i)}
                      style={{
                        breakInside: 'avoid', marginBottom: '1.25rem', borderRadius: 16,
                        overflow: 'hidden', cursor: 'pointer', position: 'relative',
                        boxShadow: '0 4px 16px rgba(10,22,40,0.1)',
                        transition: 'transform .3s, box-shadow .3s',
                        background: '#0a1628'
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = 'translateY(-4px) scale(1.01)';
                        el.style.boxShadow = '0 12px 32px rgba(10,22,40,0.2)';
                        el.querySelector('.gal-overlay')?.classList.add('visible');
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = '';
                        el.style.boxShadow = '0 4px 16px rgba(10,22,40,0.1)';
                        el.querySelector('.gal-overlay')?.classList.remove('visible');
                      }}>

                      {vid ? (
                        <video src={cxVideo(item.url)} muted playsInline preload="metadata"
                          style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: fp }} />
                      ) : (
                        <img src={cxCard(item.url)} alt={item.alt || `Evento J&M ${i + 1}`}
                          loading={i < 6 ? 'eager' : 'lazy'}
                          decoding="async"
                          style={{
                            width: '100%', display: 'block', objectFit: 'cover', objectPosition: fp,
                            transition: 'transform .5s'
                          }} />
                      )}

                      {/* Video badge */}
                      {vid && (
                        <div style={{
                          position: 'absolute', top: 10, left: 10, background: 'rgba(10,22,40,0.82)',
                          color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                          padding: '3px 9px', borderRadius: 999, pointerEvents: 'none'
                        }}>
                          🎬 Video
                        </div>
                      )}

                      {/* Overlay */}
                      <div className="gal-overlay"
                        style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(to top,rgba(10,22,40,0.8) 0%,transparent 60%)',
                          opacity: 0, transition: 'opacity .3s', pointerEvents: 'none'
                        }}>
                        <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                          {item.categoria && (
                            <span style={{
                              display: 'inline-block', background: 'rgba(212,160,23,0.9)',
                              color: '#0a1628', fontSize: '0.65rem', fontWeight: 700,
                              padding: '2px 9px', borderRadius: 999, textTransform: 'uppercase',
                              letterSpacing: '.06em', marginBottom: 4
                            }}>
                              {item.categoria}
                            </span>
                          )}
                          {item.subcategoria && (
                            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', margin: 0 }}>
                              {item.subcategoria}
                            </p>
                          )}
                          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '2px 0 0' }}>
                            {vid ? '▶ Reproducir' : '🔍 Ver en grande'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cargar más */}
              {visibleLimit < visibles.length && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: '2.5rem' }}>
                  {loadingMore ? (
                    <CapybaraLoader inline label="Cargando más fotos..." />
                  ) : (
                    <button
                      onClick={() => {
                        setLoadingMore(true);
                        setTimeout(() => {
                          setVisibleLimit(l => l + PAGE_SIZE);
                          setLoadingMore(false);
                        }, 600);
                      }}
                      style={{
                        padding: '0.85rem 2rem', borderRadius: 999, border: '1px solid rgba(30,58,95,0.2)',
                        background: '#fff', color: '#1e3a5f', fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(10,22,40,0.08)', transition: 'transform .2s, box-shadow .2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      Cargar más fotos ({visibles.length - visibleLimit} restantes)
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '4rem 0', background: 'linear-gradient(135deg,#0a1628,#1e3a5f)', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ color: '#fff', marginBottom: '1rem' }}>¿Te gustó lo que viste?</h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', marginBottom: '2rem', fontSize: '1.05rem' }}>
            Tu evento puede ser el próximo. Contáctanos y lo hacemos realidad.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            <a href="/contacto"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '1rem 2rem',
                borderRadius: 9999, background: 'linear-gradient(135deg,#b8860b,#f5c842)',
                color: '#0a1628', fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(212,160,23,0.4)', transition: 'all .3s'
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
              Solicitar Cotización
            </a>
            <a href="https://wa.me/51945203708" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '1rem 2rem',
                borderRadius: 9999, background: '#25d366', color: '#fff',
                fontWeight: 700, textDecoration: 'none', transition: 'all .3s'
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
              💬 WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && visibles[lightbox] && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(5,13,26,0.96)',
          backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '16px 16px 12px', cursor: 'zoom-out'
        }}
          onClick={() => setLightbox(null)}>

          {/* Botón cerrar — siempre arriba a la derecha */}
          <button onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, right: 16, width: 40, height: 40,
              borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none',
              color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', transition: 'background .2s', zIndex: 1
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'}>
            ✕
          </button>

          <div onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 960, width: '100%', cursor: 'default', display: 'flex',
              flexDirection: 'column', gap: 10,
              animation: 'lbIn .3s cubic-bezier(0.34,1.56,0.64,1)'
            }}>

            {/* Media — sin nada encima */}
            {isVideo(visibles[lightbox]) ? (
              <CustomVideoPlayer key={visibles[lightbox].id} rawUrl={visibles[lightbox].url} />
            ) : (
              <img src={cxFull(visibles[lightbox].url)}
                alt={visibles[lightbox].alt || 'Evento J&M'}
                decoding="async"
                style={{
                  width: '100%', maxHeight: '72vh', objectFit: 'contain', display: 'block',
                  borderRadius: 16, boxShadow: '0 32px 80px rgba(0,0,0,0.6)'
                }} />
            )}

            {/* Barra inferior: flechas + info centrada */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

              <button onClick={e => { e.stopPropagation(); setLightbox(p => ((p! - 1 + visibles.length) % visibles.length)); }}
                style={{
                  flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'all .2s'
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,0.3)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}>
                ←
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                {visibles[lightbox].categoria && (
                  <span style={{
                    display: 'inline-block', background: 'rgba(212,160,23,0.9)', color: '#0a1628',
                    fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2
                  }}>
                    {visibles[lightbox].categoria}
                    {visibles[lightbox].subcategoria ? ` › ${visibles[lightbox].subcategoria}` : ''}
                  </span>
                )}
                {visibles[lightbox].alt && (
                  <p style={{
                    color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', margin: '2px 0 0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {visibles[lightbox].alt}
                  </p>
                )}
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', margin: '2px 0 0' }}>
                  {lightbox + 1} / {visibles.length}
                </p>
              </div>

              <button onClick={e => { e.stopPropagation(); setLightbox(p => ((p! + 1) % visibles.length)); }}
                style={{
                  flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'all .2s'
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,0.3)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}>
                →
              </button>
            </div>

            <ShareBar
              itemId={visibles[lightbox].id}
              title={visibles[lightbox].alt || visibles[lightbox].categoria}
              {...(isVideo(visibles[lightbox])
                ? { videoUrl: cxShareVideo(visibles[lightbox].url) }
                : { imageUrl: cxFull(visibles[lightbox].url) }
              )}
            />
          </div>
        </div>
      )}

      <style>{`
        .gal-overlay.visible { opacity: 1 !important; }
        @keyframes lbIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        @media(max-width:768px){ div[style*="columns:3"] { columns: 2 180px !important; gap:0.875rem !important; } }
        @media(max-width:480px){ div[style*="columns:3"], div[style*="columns:2"] { columns: 1 !important; } }
        @media(max-width:640px){
          .gal-filters-scroll{ -webkit-overflow-scrolling:touch; scrollbar-width:none; }
          .gal-filters-scroll::-webkit-scrollbar{ display:none; }
        }
      `}</style>
    </>
  );
}
