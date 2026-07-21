'use client';

/* template.tsx se re-monta en cada navegación: fundido suave de entrada para
   que el cambio de página se sienta fluido en vez de un corte seco. Solo
   opacity/transform (cero CLS) y desactivado con prefers-reduced-motion. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-transition">
      {children}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .page-transition { animation: pageIn .45s cubic-bezier(.22,1,.36,1); }
        }
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
