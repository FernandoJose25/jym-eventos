'use client';
import { useEffect, useRef, type ReactNode } from 'react';
export default function AnimateOnScroll({ children, delay=0 }: { children:ReactNode; delay?:number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.opacity = '0'; el.style.transform = 'translateY(28px)';
    el.style.transition = `opacity .6s ease ${delay}s, transform .6s ease ${delay}s`;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity='1'; el.style.transform='translateY(0)'; obs.disconnect(); }
    }, { threshold: .12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return <div ref={ref}>{children}</div>;
}
