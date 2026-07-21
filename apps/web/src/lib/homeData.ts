import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function toPlain(data: Record<string, any>): Record<string, any> {
  const r: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) r[k] = v;
    else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') r[k] = v;
    else if (Array.isArray(v)) r[k] = v.map((x: any) =>
      typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean' ? x
        : typeof x === 'object' && !x?.toDate && !('seconds' in x) ? toPlain(x) : String(x)
    );
    else if (v?.toDate) r[k] = v.toDate().toISOString();
    else if (typeof v === 'object' && 'seconds' in v) r[k] = new Date(v.seconds * 1000).toISOString();
    else if (typeof v === 'object') r[k] = toPlain(v);
  }
  return r;
}

export type HomeData = {
  hero: any; stats: any; about: any; contacto: any;
  services: any[]; gallery: any[]; testimonials: any[];
  whyUs: any; brands: any; faq: any; loaded: true;
};

/**
 * Trae todo el contenido de la Home directamente en el servidor
 * (Server Component), para que el HTML llegue ya completo — sin
 * pantalla de carga y visible para buscadores/bots.
 */
export async function getHomeData(): Promise<HomeData> {
  try {
    const [heroS, statsS, aboutS, contactoS, whyUsS, brandsS, faqS, servicesS, galleryS, testimonialsS] =
      await Promise.allSettled([
        getDoc(doc(db, 'site_config', 'hero')),
        getDoc(doc(db, 'site_config', 'stats')),
        getDoc(doc(db, 'site_config', 'about')),
        getDoc(doc(db, 'site_config', 'contacto')),
        getDoc(doc(db, 'site_config', 'why-us')),
        getDoc(doc(db, 'site_config', 'brands')),
        getDoc(doc(db, 'site_config', 'faq')),
        getDocs(query(collection(db, 'services'), where('visible', '==', true), orderBy('order', 'asc'))),
        getDocs(query(collection(db, 'gallery_items'), where('visible', '==', true), orderBy('order', 'asc'))),
        getDocs(query(collection(db, 'testimonials'), where('visible', '==', true), orderBy('order', 'asc'))),
      ]);

    return {
      hero: heroS.status === 'fulfilled' && heroS.value.exists() ? toPlain(heroS.value.data()) : {},
      stats: statsS.status === 'fulfilled' && statsS.value.exists() ? toPlain(statsS.value.data()) : {},
      about: aboutS.status === 'fulfilled' && aboutS.value.exists() ? toPlain(aboutS.value.data()) : {},
      contacto: contactoS.status === 'fulfilled' && contactoS.value.exists() ? toPlain(contactoS.value.data()) : {},
      whyUs: whyUsS.status === 'fulfilled' && whyUsS.value.exists() ? toPlain(whyUsS.value.data()) : null,
      brands: brandsS.status === 'fulfilled' && brandsS.value.exists() ? toPlain(brandsS.value.data()) : null,
      faq: faqS.status === 'fulfilled' && faqS.value.exists() ? toPlain(faqS.value.data()) : null,
      services: servicesS.status === 'fulfilled' ? servicesS.value.docs.map(d => toPlain({ id: d.id, ...d.data() })) : [],
      gallery: galleryS.status === 'fulfilled' ? galleryS.value.docs.map(d => toPlain({ id: d.id, ...d.data() })) : [],
      testimonials: testimonialsS.status === 'fulfilled' ? testimonialsS.value.docs.map(d => toPlain({ id: d.id, ...d.data() })) : [],
      loaded: true,
    };
  } catch (e) {
    console.error('[getHomeData]', e);
    return {
      hero: {}, stats: {}, about: {}, contacto: {},
      services: [], gallery: [], testimonials: [],
      whyUs: null, brands: null, faq: null, loaded: true,
    };
  }
}
