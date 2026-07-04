'use client';
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

// Wrapper con animación de entrada al scroll
function Section({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div className={`reveal ${className}`}
         style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
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
