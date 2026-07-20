import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Luminex Studio & Events — Redes Sociales',
  description: 'Síguenos en nuestras redes sociales.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
