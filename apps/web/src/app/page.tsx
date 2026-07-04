import type { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getHomeData } from '@/lib/homeData';
import HomeClient from './HomeClient';

const DEFAULT_TITLE = 'Shows, Decoración y Catering en Sechura, Piura';
const DEFAULT_DESC = 'Organizamos shows infantiles, hora loca, decoración temática y catering en Sechura, Piura. +500 eventos realizados. Cotiza gratis por WhatsApp.';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const snap = await getDoc(doc(db, 'site_config', 'seo'));
    const data = snap.exists() ? snap.data() : {};
    return {
      title: data.homeTitle || DEFAULT_TITLE,
      description: data.homeDesc || DEFAULT_DESC,
    };
  } catch {
    return { title: DEFAULT_TITLE, description: DEFAULT_DESC };
  }
}

export default async function HomePage() {
  const data = await getHomeData();
  return <HomeClient data={data} />;
}