import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'Shows, Decoración y Catering en Sechura, Piura',
  description: 'Organizamos shows infantiles, hora loca, decoración temática y catering en Sechura, Piura. +500 eventos realizados. Cotiza gratis por WhatsApp.',
};

export default function HomePage() {
  return <HomeClient />;
}