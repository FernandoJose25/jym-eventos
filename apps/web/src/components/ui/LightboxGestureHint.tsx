'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HINT_KEY = 'jm_gallery_gesture_hint_seen_v1';

export function hasSeenGestureHint(): boolean {
  try {
    return !!localStorage.getItem(HINT_KEY);
  } catch {
    return false; // si falla localStorage, mejor mostrar de más que nunca
  }
}

export function markGestureHintSeen() {
  try { localStorage.setItem(HINT_KEY, '1'); } catch { /* no crítico */ }
}

/**
 * Overlay de ayuda gestual, superpuesto al medio del lightbox — solo mobile.
 * `pointerEvents: none` para no bloquear los gestos reales del usuario: el
 * mismo toque que "usa" un gesto también lo descarta.
 */
export default function LightboxGestureHint({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 14, padding: '2rem', textAlign: 'center',
            background: 'rgba(5,13,26,0.55)', backdropFilter: 'blur(2px)',
            borderRadius: 16,
          }}
        >
          {[
            { icon: '↕', text: 'Desliza para ver más' },
            { icon: '🤏', text: 'Pellizca o doble-toca al centro para acercar' },
            { icon: '⏩', text: 'Doble-toca los bordes del video para avanzar/retroceder' },
          ].map((line, i) => (
            <motion.p
              key={line.text}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.3 }}
              style={{ color: '#fff', fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: 10, maxWidth: 280 }}
            >
              <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{line.icon}</span>
              <span>{line.text}</span>
            </motion.p>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
