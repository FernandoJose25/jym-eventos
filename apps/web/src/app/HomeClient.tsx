'use client';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
// Cargadas de inmediato: son lo primero que se ve al abrir la home, así que
// deben estar en el bundle inicial (arriba del pliegue).
import HeroSection         from '@/components/sections/HeroSection';
import StatsSection        from '@/components/sections/StatsSection';
import StoriesSection      from '@/components/sections/StoriesSection';
// El resto se difiere con next/dynamic: no descargan ni ejecutan su JS hasta
// que hacen falta, lo que aligera muchísimo la carga inicial en móviles de
// gama media (era la causa de la lentitud percibida en celular, no las
// imágenes ni el caché). Todas se renderizan igual al hacer scroll gracias
// al wrapper <Section> con whileInView.
const ServicesSection        = dynamic(() => import('@/components/sections/ServicesSection'));
const WhyUsSection           = dynamic(() => import('@/components/sections/WhyUsSection'));
const GallerySection         = dynamic(() => import('@/components/sections/GallerySection'));
const AboutSection           = dynamic(() => import('@/components/sections/AboutSection'));
const TestimonialsSection    = dynamic(() => import('@/components/sections/TestimonialsSection'));
const FaqSection             = dynamic(() => import('@/components/sections/FaqSection'));
const CotizadorSection       = dynamic(() => import('@/components/sections/CotizadorSection'));
const TransformacionesSection = dynamic(() => import('@/components/sections/TransformacionesSection'));
const BrandsSection          = dynamic(() => import('@/components/sections/BrandsSection'));
const ContactSection         = dynamic(() => import('@/components/sections/ContactSection'));
import type { HomeData }   from '@/lib/homeData';

// Wrapper con animación de entrada al scroll (fade + slide suave, sin rebote)
function Section({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

export default function HomeClient({ data }: { data: HomeData }) {
  return (
    <>
      {/* Hero con las Historias superpuestas encima (solo mobile). El wrapper
          relativo deja que las historias floten sobre la parte superior del
          hero en posición absoluta, así se van con el scroll en vez de empujar
          el hero hacia abajo. */}
      <div style={{ position: 'relative' }}>
        <div className="stories-overlay-mobile">
          <StoriesSection items={data.gallery} stories={data.stories} />
        </div>
        {/* Hero — sin reveal (es lo primero que se ve) */}
        <HeroSection data={data.hero} />
      </div>

      {/* Stats */}
      <Section>
        <StatsSection data={{ ...data.stats, s4num: String(data.services.length) }} />
      </Section>

      {/* Marcas — carrusel justo después de las stats, como en el diseño */}
      <Section>
        <BrandsSection data={data.brands} />
      </Section>

      {/* Por qué elegirnos */}
      <Section>
        <WhyUsSection data={data.whyUs} />
      </Section>

      {/* About / Quiénes somos */}
      <Section>
        <AboutSection data={data.about} />
      </Section>

      {/* Servicios */}
      <Section>
        <ServicesSection services={data.services} />
      </Section>

      {/* Cotizador guiado — 3 pasos que terminan en WhatsApp con el mensaje listo */}
      <Section>
        <CotizadorSection services={data.services} />
      </Section>

      {/* Antes / Después — prueba visual de la transformación (si hay pares cargados) */}
      <Section>
        <TransformacionesSection data={data.transformaciones} />
      </Section>

      {/* Galería */}
      <Section>
        <GallerySection items={data.gallery} />
      </Section>

      {/* Testimonios */}
      <Section>
        <TestimonialsSection items={data.testimonials} />
      </Section>

      {/* Preguntas frecuentes — resuelve dudas antes del contacto y empuja a WhatsApp */}
      <Section>
        <FaqSection data={data.faq} />
      </Section>

      {/* Contacto */}
      <Section>
        <ContactSection data={data.contacto} />
      </Section>
    </>
  );
}
