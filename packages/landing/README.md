# @otb/landing — OTB Don Bosco Landing

Landing pública estática inspirada en https://www.atechlogistics.com para la OTB Don Bosco.
Next.js 16 (App Router) + Tailwind 4 + contenido estático tipado en `src/content/site.ts`.

## Desarrollo

```bash
# desde la raíz del monorepo
npm run dev:landing        # http://localhost:3002

# o directo en el paquete
npm run dev --workspace=@otb/landing
npm run build --workspace=@otb/landing
```

- Puerto **3002** (server 3001, client 5173)
- Contenido editable en `src/content/site.ts` (sin backend por ahora)
- Imágenes vía `next/image` (Unsplash placeholders)

## Estructura

```
src/
  app/layout.tsx, page.tsx, globals.css
  components/layout/header.tsx, footer.tsx
  components/sections/*  # hero, stats-bar, logos-strip, value-props, coverage, tech-feature, services-grid, partnership, faq, final-cta
  components/ui/*        # button, badge, accordion
  content/site.ts        # fuente única de textos
  lib/utils.ts
```

## Personalización

Edita `src/content/site.ts` para cambiar textos, métricas, teléfonos, zonas, tarifas. Reemplaza imágenes en `public/` o URLs remotas (configuradas en `next.config.ts`).

Portal Socios apunta a `NEXT_PUBLIC_PORTAL_URL` (default `http://localhost:5173/login`).
