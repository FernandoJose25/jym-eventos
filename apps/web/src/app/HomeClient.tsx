'use client';
import { motion } from 'framer-motion';
import HeroSection         from '@/components/sections/HeroSection';
import StatsSection        from '@/components/sections/StatsSection';
import ServicesSection     from '@/components/sections/ServicesSection';
import WhyUsSection        from '@/components/sections/WhyUsSection';
import GallerySection      from '@/components/sections/GallerySection';
import AboutSection        from '@/components/sections/AboutSection';
import TestimonialsSection from '@/components/sections/TestimonialsSection';
import BrandsSection       from '@/components/sections/BrandsSection';
import ContactSection      from '@/components/sections/ContactSection';
import type { HomeData }   from '@/lib/homeData';

// Wrapper con animación de entrada al scroll (spring físico vía Framer Motion)
function Section({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -80px 0px' }}
      transition={{ type: 'spring', stiffness: 60, damping: 16, delay }}
    >
      {children}
    </motion.div>
  );
}

export default function HomeClient({ data }: { data: HomeData }) {
  return (
    <>
      {/* Hero — sin reveal (es lo primero que se ve) */}
      <HeroSection data={data.hero} />

      {/* Stats */}
      <Section>
        <StatsSection data={{ ...data.stats, s4num: String(data.services.length) }} />
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
        <AboutSection data={data.about} />
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
