import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Luminex Studio & Events — Fotografía Instantánea',
  description: 'Fotografía que convierte cada momento en un recuerdo eterno.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
