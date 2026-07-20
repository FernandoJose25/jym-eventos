'use client';
import { useRef, useState, useCallback } from 'react';
import { useMotionValue, animate } from 'framer-motion';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const RESET_THRESHOLD = 1.05;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DIST = 30;
const PAN_START_THRESHOLD = 10; // px de movimiento antes de considerarlo pan y no un tap

interface Point { x: number; y: number }

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Pinch-to-zoom con pan persistente para un elemento de medio (imagen o
 * video). El zoom NO vuelve a 1x automáticamente al soltar los dedos —
 * persiste hasta que el usuario hace pinch-out por debajo de 1x o
 * doble-tap (reset). Mientras `isZoomed` es true, el consumidor debe
 * desactivar el swipe de navegación (o el doble-tap-seek en video) para
 * que no compitan con el pan/reset de este hook.
 */
export function useZoomPan(containerRef: React.RefObject<HTMLElement | null>) {
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const panStart = useRef<Point>({ x: 0, y: 0 });
  const originStart = useRef<Point>({ x: 0, y: 0 });
  const isPinching = useRef(false);
  const isPanning = useRef(false);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);

  const clampPan = useCallback((nx: number, ny: number, s: number) => {
    const el = containerRef.current;
    if (!el) return { x: nx, y: ny };
    const rect = el.getBoundingClientRect();
    const maxX = (rect.width * (s - 1)) / 2;
    const maxY = (rect.height * (s - 1)) / 2;
    return {
      x: Math.min(Math.max(nx, -maxX), maxX),
      y: Math.min(Math.max(ny, -maxY), maxY),
    };
  }, [containerRef]);

  const reset = useCallback(() => {
    animate(scale, 1, { duration: 0.25 });
    animate(x, 0, { duration: 0.25 });
    animate(y, 0, { duration: 0.25 });
    setIsZoomed(false);
  }, [scale, x, y]);

  const zoomAt = useCallback((point: Point, targetScale: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = point.x - rect.left - rect.width / 2;
    const cy = point.y - rect.top - rect.height / 2;
    const nx = -cx * (targetScale - 1);
    const ny = -cy * (targetScale - 1);
    const clamped = clampPan(nx, ny, targetScale);
    animate(scale, targetScale, { duration: 0.25 });
    animate(x, clamped.x, { duration: 0.25 });
    animate(y, clamped.y, { duration: 0.25 });
    setIsZoomed(targetScale > RESET_THRESHOLD);
  }, [containerRef, clampPan, scale, x, y]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isPinching.current = true;
      isPanning.current = false;
      const a = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const b = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      pinchStartDist.current = dist(a, b);
      pinchStartScale.current = scale.get();
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      panStart.current = { x: t.clientX, y: t.clientY };
      originStart.current = { x: x.get(), y: y.get() };
      isPanning.current = false; // se confirma en touchmove tras superar el umbral
    }
  }, [scale, x, y]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPinching.current && e.touches.length === 2) {
      const a = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const b = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const newDist = dist(a, b);
      const factor = newDist / (pinchStartDist.current || 1);
      const targetScale = Math.min(Math.max(pinchStartScale.current * factor, MIN_SCALE), MAX_SCALE);
      scale.set(targetScale);
      const center = mid(a, b);
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const cx = center.x - rect.left - rect.width / 2;
        const cy = center.y - rect.top - rect.height / 2;
        const clamped = clampPan(-cx * (targetScale - 1), -cy * (targetScale - 1), targetScale);
        x.set(clamped.x);
        y.set(clamped.y);
      }
      e.preventDefault();
      return;
    }

    if (e.touches.length === 1 && scale.get() > RESET_THRESHOLD) {
      const t = e.touches[0];
      const dx = t.clientX - panStart.current.x;
      const dy = t.clientY - panStart.current.y;
      if (!isPanning.current && Math.hypot(dx, dy) < PAN_START_THRESHOLD) return;
      isPanning.current = true;
      const clamped = clampPan(originStart.current.x + dx, originStart.current.y + dy, scale.get());
      x.set(clamped.x);
      y.set(clamped.y);
      e.preventDefault();
    }
  }, [scale, x, y, clampPan, containerRef]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      const wasPinching = isPinching.current;
      const wasPanning = isPanning.current;
      isPinching.current = false;
      isPanning.current = false;

      if (wasPinching) {
        if (scale.get() < RESET_THRESHOLD) reset();
        else setIsZoomed(true);
        return;
      }

      if (wasPanning) return; // fue un pan, no evaluar como tap

      // Candidato a tap simple o doble-tap (solo si no hubo pinch/pan)
      const t = e.changedTouches[0];
      if (!t) return;
      const now = Date.now();
      const last = lastTap.current;
      const isDoubleTap =
        !!last &&
        now - last.time < DOUBLE_TAP_MS &&
        dist({ x: t.clientX, y: t.clientY }, { x: last.x, y: last.y }) < DOUBLE_TAP_DIST;

      if (isDoubleTap) {
        lastTap.current = null;
        if (isZoomed || scale.get() > RESET_THRESHOLD) {
          reset();
        } else {
          zoomAt({ x: t.clientX, y: t.clientY }, 2);
        }
      } else {
        lastTap.current = { time: now, x: t.clientX, y: t.clientY };
      }
    }
  }, [scale, isZoomed, reset, zoomAt]);

  return {
    scale,
    x,
    y,
    isZoomed,
    reset,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
