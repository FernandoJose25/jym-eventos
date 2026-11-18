# J&M Decoraciones y Eventos — Plataforma web

[![CI](https://github.com/FernandoJose25/jym-eventos/actions/workflows/ci.yml/badge.svg)](https://github.com/FernandoJose25/jym-eventos/actions/workflows/ci.yml)
![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth%20%2B%20Storage-FFCA28?logo=firebase&logoColor=black)

Plataforma digital de **J&M Decoraciones y Eventos**, mi empresa de organización de eventos en Sechura, Piura (Perú). Incluye el sitio público, el panel de administración y dos páginas de enlaces para redes sociales, todo en un monorepo. Está en producción: **[jmdecoracionesyeventos.com](https://jmdecoracionesyeventos.com)**.

> **English summary:** Production web platform for my event-planning business, built as a pnpm monorepo of four Next.js 16 apps: an SEO-optimized public site (ISR from Firestore, dynamic sitemap, structured data), an admin dashboard (content, galleries, users, GA4 analytics, AI-generated service copy, Google Photos / iCloud album import), a "guest camera" feature where event guests upload photos through a QR link, and two link-in-bio pages. Firebase (Firestore, Auth, Storage with security rules), Cloudinary, Resend and Groq.

![Sitio público](docs/screenshots/web.png)

## Mi rol

Soy dueño de la empresa y el único desarrollador de la plataforma (más de 300 commits): diseño, frontend, backend, modelo de datos y reglas de seguridad en Firebase, SEO, integraciones y despliegue.

## Apps del monorepo

| App | Qué es | Puerto local |
|---|---|---|
| [`apps/web`](apps/web) | Sitio público: servicios, galería, álbumes de eventos, contacto y cotización | 3000 |
| [`apps/admin`](apps/admin) | Panel de administración con login y roles | 3001 |
| [`apps/redes`](apps/redes) | Página de enlaces (link in bio) de J&M | 3002 |
| [`apps/luminex-redes`](apps/luminex-redes) | Página de enlaces de Luminex Studio (fotografía instantánea) | 3003 |

## Qué hace

**Sitio público (`web`)**
- Páginas de servicios generadas desde Firestore con **ISR** (se regeneran cada hora o bajo demanda desde el panel), con datos de respaldo si Firestore no responde.
- **SEO técnico:** sitemap dinámico, `robots.ts`, metadatos por página y datos estructurados (Schema.org `LocalBusiness`).
- Galería y **álbumes de eventos** con fotos y videos.
- **Cámara de invitados:** cada evento tiene un QR. Los invitados suben sus fotos sin crear cuenta y el endpoint valida el token, el álbum activo, el tamaño y tipo del archivo y un rate limit.
- Formulario de contacto con validación (Zod), envío de correo (Resend) y botón de WhatsApp.
- Banner de cookies con consentimiento, y páginas de privacidad y términos.

**Panel de administración (`admin`)**
- Login con Firebase Auth, sesión por cookie, límite de intentos y gestión de usuarios con roles.
- CRUD de servicios, galería y álbumes. Subida firmada a **Cloudinary** y clasificación de fotos.
- **Generación de textos de servicios con IA** (Groq, LLaMA 3.3 70B) y sugerencias de contenido.
- Importación de álbumes desde **Google Photos** (OAuth con refresh token guardado del lado del servidor) y desde **iCloud**.
- **Analíticas** del sitio con la API de Google Analytics 4 (gráficos con Recharts).
- Generador de **QR artístico**, historias de Instagram, mensajes de contacto y revalidación del sitio público con un clic.

## Stack

| Capa | Tecnologías |
|---|---|
| Frontend | Next.js 16 (App Router, Server Components, ISR), React 19, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Route Handlers de Next.js, Firebase Admin SDK |
| Datos | Firebase: Firestore, Auth y Storage, con reglas de seguridad e índices versionados en el repo |
| Integraciones | Cloudinary, Resend, Groq, Google Analytics 4 Data API, Google Photos, Google Maps |
| Monorepo | pnpm workspaces |
| Despliegue | Vercel |

## Correr el proyecto

Requisitos: Node 22+ y pnpm 11.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local       # igual para cada app que quieras correr
pnpm --filter web dev                               # http://localhost:3000
pnpm --filter admin dev                             # http://localhost:3001
pnpm -r build                                       # build de las 4 apps
```

Las 4 apps compilan sin credenciales de Firebase, usando los datos de respaldo. Así se verifican en CI. Para ver datos reales, completa los `.env.local` con tu proyecto de Firebase.
