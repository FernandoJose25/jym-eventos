'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CapybaraLoader      from '@/components/ui/CapybaraLoader';
import HeroSection         from '@/components/sections/HeroSection';
import StatsSection        from '@/components/sections/StatsSection';
import ServicesSection     from '@/components/sections/ServicesSection';
import WhyUsSection        from '@/components/sections/WhyUsSection';
import GallerySection      from '@/components/sections/GallerySection';
import AboutSection        from '@/components/sections/AboutSection';
import TestimonialsSection from '@/components/sections/TestimonialsSection';
import BrandsSection       from '@/components/sections/BrandsSection';
import ContactSection      from '@/components/sections/ContactSection';

function toPlain(data: Record<string,any>): Record<string,any> {
  const r: Record<string,any> = {};
  for (const [k,v] of Object.entries(data)) {
    if (v===null||v===undefined) r[k]=v;
    else if (typeof v==='string'||typeof v==='number'||typeof v==='boolean') r[k]=v;
    else if (Array.isArray(v)) r[k]=v.map((x:any)=>
      typeof x==='string'||typeof x==='number'||typeof x==='boolean' ? x
      : typeof x==='object'&&!x?.toDate&&!('seconds' in x) ? toPlain(x) : String(x)
    );
    else if (v?.toDate) r[k]=v.toDate().toISOString();
    else if (typeof v==='object'&&'seconds' in v) r[k]=new Date(v.seconds*1000).toISOString();
    else if (typeof v==='object') r[k]=toPlain(v);
  }
  return r;
}

// Wrapper con animación de entrada al scroll
function Section({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div className={`reveal ${className}`}
         style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

export default function HomeClient() {
  const [data, setData] = useState<any>({
    hero:{}, stats:{}, about:{}, contacto:{},
    services:[], gallery:[], testimonials:[],
    whyUs:null, brands:null, loaded:false,
  });

  useEffect(() => {
    (async () => {
      try {
        const [heroS,statsS,aboutS,contactoS,whyUsS,brandsS,servicesS,galleryS,testimonialsS] =
          await Promise.allSettled([
            getDoc(doc(db,'site_config','hero')),
            getDoc(doc(db,'site_config','stats')),
            getDoc(doc(db,'site_config','about')),
            getDoc(doc(db,'site_config','contacto')),
            getDoc(doc(db,'site_config','why-us')),
            getDoc(doc(db,'site_config','brands')),
            getDocs(query(collection(db,'services'),     where('visible','==',true),orderBy('order','asc'))),
            getDocs(query(collection(db,'gallery_items'),where('visible','==',true),orderBy('order','asc'))),
            getDocs(query(collection(db,'testimonials'), where('visible','==',true),orderBy('order','asc'))),
          ]);
        setData({
          hero:        heroS.status==='fulfilled'&&heroS.value.exists()        ? toPlain(heroS.value.data())        : {},
          stats:       statsS.status==='fulfilled'&&statsS.value.exists()      ? toPlain(statsS.value.data())       : {},
          about:       aboutS.status==='fulfilled'&&aboutS.value.exists()      ? toPlain(aboutS.value.data())       : {},
          contacto:    contactoS.status==='fulfilled'&&contactoS.value.exists()? toPlain(contactoS.value.data())    : {},
          whyUs:       whyUsS.status==='fulfilled'&&whyUsS.value.exists()      ? toPlain(whyUsS.value.data())       : null,
          brands:      brandsS.status==='fulfilled'&&brandsS.value.exists()    ? toPlain(brandsS.value.data())      : null,
          services:    servicesS.status==='fulfilled'    ? servicesS.value.docs.map(d=>toPlain({id:d.id,...d.data()}))    : [],
          gallery:     galleryS.status==='fulfilled'     ? galleryS.value.docs.map(d=>toPlain({id:d.id,...d.data()}))     : [],
          testimonials:testimonialsS.status==='fulfilled'? testimonialsS.value.docs.map(d=>toPlain({id:d.id,...d.data()})) : [],
          loaded:true,
        });
        // scroll to hash after data loads (element exists now)
        const hash = window.location.hash.slice(1);
        if (hash) {
          setTimeout(() => {
            document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      } catch(e) {
        console.error('[HomeClient]',e);
        setData((p:any)=>({...p,loaded:true}));
      }
    })();
  }, []);

  if (!data.loaded) return <CapybaraLoader />;

  return (
    <>
      {/* Hero — sin reveal (es lo primero que se ve) */}
      <HeroSection data={data.hero} />

      {/* Stats */}
      <Section>
        <StatsSection data={data.stats} />
      </Section>

      {/* Por qué elegirnos */}
      <Section>
        <WhyUsSection data={data.whyUs} />
      </Section>

      {/* Marcas */}
      <Section>
        <BrandsSection data={data.brands} />
      </Section>

      {/* About / Quiénes somos */}
      <Section>
        <div id="nosotros">
          <AboutSection data={data.about} />
        </div>
      </Section>

      {/* Servicios */}
      <Section>
        <ServicesSection services={data.services} />
      </Section>

      {/* Galería */}
      <Section>
        <GallerySection items={data.gallery} />
      </Section>

      {/* Testimonios */}
      <Section>
        <TestimonialsSection items={data.testimonials} />
      </Section>

      {/* Contacto */}
      <Section>
        <ContactSection data={data.contacto} />
      </Section>
    </>
  );
}
