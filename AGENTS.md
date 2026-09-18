# AGENTS.md

## Quick Start
1. Copy `.env.example` values into `packages/server/.env` (the server actually loads `.env` from `packages/server/`, NOT the repo root) and adjust secrets
2. Start database: `npm run db:up`
3. Run both services: `npm run dev`
   - Server: http://localhost:3001/api
   - Client: http://localhost:5173
   - Swagger docs: http://localhost:3001/api/docs

## Repository Structure
- Monorepo using npm workspaces
- `packages/server` - NestJS 11 backend with TypeORM
- `packages/client` - React 19 + Vite 6 frontend (PWA via `vite-plugin-pwa`)
- `packages/landing` - Next.js 16 landing page (port 3002, static content)
- Root scripts orchestrate both packages; `npm run build` builds server then client (not landing)

## Critical Commands
- `npm run db:up` / `npm run db:down` - Docker Postgres (port 5433 → 5432)
- `npm run dev` - concurrently starts server (`npm:dev:server`) and client (`npm:dev:client`)
- `npm run build` - builds both packages (server then client)
- `npm run lint` - runs ESLint across all workspaces
  - Server lint (`eslint ... --fix`) **rewrites files in place** with `--fix`; client lint does not
  - Client lint fails on `react-hooks/set-state-in-effect` (calling setState synchronously in an effect body is an ERROR) and a few other rules; see Client Specifics
- `npm run test` - runs Jest (server only; client has no test setup)
  - **Currently exits with code 1 "No tests found"** because the server has no test files yet (0 matches in testMatch); this is expected, not a real failure

## Server Specifics
- Entry: `packages/server/src/main.ts`
- Global prefix: `/api` (e.g., `/api/auth/login`)
- CORS: allows `http://localhost:5173` by default (configurable via `CORS_ORIGIN`)
- Express body parsers are DISABLED by default; `main.ts` reads `BODY_LIMIT` (default `10mb`) and re-adds `express.json`/`express.urlencoded` with that limit. Base64 images are sent in JSON body, so keep `BODY_LIMIT` high
- Swagger UI: `/api/docs` (requires Bearer token)
- Auth: JWT with access (15m) and refresh (7d) tokens
- Database: TypeORM with auto-sync in development (`NODE_ENV !== production`)
- Migrations: `npm run migration:generate`, `migration:run`, `migration:revert` (via `typeorm-ts-node-commonjs -d src/database/data-source.ts`)
- Config modules: `src/config/*.config.ts` using `registerAs` pattern (`app`, `database`, `audit`, `openwa`, `logger`; EnvironmentVariables in `.env`)
- Logging: uses nest-winston (winston), JSON format, Console + daily rotate `logs/backend-%DATE%.log` in server cwd; level from `LOG_LEVEL`
- Global providers: `JwtAuthGuard`, `RolesGuard`, `AuditContextInterceptor`, `HttpLogInterceptor`
- Scheduling: `@nestjs/schedule` cron jobs (e.g., billing/notification jobs run at 8am La Paz time); events via `@nestjs/event-emitter` (e.g., `bill.generated`, `payment.completed` → WhatsApp/report flows)

## Client Specifics
- Entry: `packages/client/src/main.tsx`
- Vite dev server: port 5173
- API base: `import.meta.env.VITE_API_URL` (defaults to `http://localhost:3001/api`)
- Routing: React Router v6 with lazy-loaded pages and `ProtectedRoute`
- State: TanStack Query with defaults: `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30s`
- Local state: `zustand` stores (`auth.ts`, `sidebar.ts`)
- Forms: `react-hook-form` + `zod` + `@hookform/resolvers`
- UI: `@base-ui/react` (migrated from Radix; see `.migration/project.md`)
- Auth flow: access/refresh tokens in localStorage; interceptor auto-refreshes on 401
- Error handling: `getApiErrorMessage()` maps backend messages to i18n keys (exact + prefix matches)
- i18n: supports `en` and `es`; stored in `localStorage` as `otb_lang`
- PWA: service worker with auto-update; `devOptions: { enabled: false }` in dev
- Alias: `@` → `./src`

## Environment Variables
Required (see `.env.example` — but the running values live in `packages/server/.env`):
- Database: `DB_HOST`, `DB_PORT` (default 5433), `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- Server: `PORT` (3001), `NODE_ENV`, `CORS_ORIGIN` (optional), `BODY_LIMIT` (default `10mb`)
- JWT: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN` (15m), `JWT_REFRESH_EXPIRES_IN` (7d)
- Audit: `AUDIT_LOG_RETENTION_DAYS` (0 = keep forever)
- Logging: `LOG_LEVEL` (default info)
- OpenWA (WhatsApp): `OPENWA_ENABLED`, `OPENWA_BASE_URL`, `OPENWA_SESSION_ID`, `OPENWA_API_KEY`, `OPENWA_CONSUMPTION_TEMPLATE_ID`, `OPENWA_WELCOME_TEMPLATE_ID`, `OPENWA_METER_REGISTERED_TEMPLATE_ID`, `OPENWA_TIMEOUT_MS`
- Image storage (S3-compatible, used by `StorageService`): `RUSTFS_ENDPOINT`, `RUSTFS_REGION`, `RUSTFS_ACCESS_KEY`, `RUSTFS_SECRET_KEY`, `RUSTFS_BUCKET`, `RUSTFS_PUBLIC_URL` — **not present in `.env.example`**; copy from `packages/server/.env`
- Client: `VITE_API_URL`

## Testing
- Server: `npm run test` (unit), `npm run test:e2e` (e2e with `jest-e2e.json`)
- No client test setup present
- Test environment: Node, ts-jest

## Linting & Formatting
- ESLint 9 with `@typescript-eslint` and Prettier integration
- Server: `.eslintrc.js` (ignores `dist`, `node_modules`, `.eslintrc.js`) — `rules` turn off `no-explicit-any` and `no-unused-vars`; `prettier/prettier` is warn
- Client: `eslint.config.js` (flat config, `eslint-plugin-react-hooks` recommended). **`react-hooks/set-state-in-effect` is treated as an ERROR** and `react-hooks/incompatible-library` is a warning; the client also flags `react-refresh/only-export-components` (warn)
- Prettier: `"prettier/prettier": "warn"` rule enabled

## TypeScript Configuration
- Server: `tsconfig.json` - CommonJS, decorators enabled, outDir `./dist`
- Client: `tsconfig.json` - ESNext, `moduleResolution: bundler`, `noEmit: true`, `jsx: react-jsx`, `strict: true`
- Client also has `tsconfig.app.json` (includes `vite.config.ts`) and `tsconfig.node.json`

## Database
- Docker Compose service `db` (Postgres 16-alpine)
- Container name: `otb-postgres`
- Volume: `otb_pgdata`
- Healthcheck uses `pg_isready`
- TypeORM entities auto-loaded; `synchronize: true` in dev only

## API Client Patterns
- Centralized `packages/client/src/lib/api.ts` with axios instance
- Request interceptor adds `Authorization: Bearer <accessToken>`
- Response interceptor handles 401 refresh flow (single concurrent refresh promise)
- Error messages mapped to i18n keys via `EXACT_ERROR_KEYS` and `PREFIX_ERROR_KEYS`
- Token storage keys: `otb_access_token`, `otb_refresh_token`

## Important Gotchas
- Server global prefix `/api` means all routes include it (Swagger setup at `api/docs`)
- CORS defaults to client origin; change `CORS_ORIGIN` for production
- The server loads `.env` from `packages/server/.env`, NOT the repo root; the root `.env.example` is just a template copy
- `synchronize: true` in dev auto-creates/alters tables from entities on boot, so `migration:run` is not needed for schema in dev. The dev DB also has a **pre-existing broken migration backlog**: scripts `1755000000007`–`1755000000010` were already applied manually but aren't recorded in the `migrations` table, so running `migration:run` fails (duplicate key on `permissions`). New migrations are fine on a fresh DB
- Image uploads: client sends `imageBase64` (data URL) → server `StorageService.uploadOptimizedImage()` resizes to 1024px JPEG q80 and stores only the object KEY in the DB (`consumptions.image_key`, `payment_history.evidence_key`), not the URL. Keys look like `consumptions/{uuid}.jpg` or `water-actions/evidence/{uuid}.jpg`; full URL = `RUSTFS_PUBLIC_URL/bucket/key`
- `BODY_LIMIT` must stay high (default 10mb) or base64 image payloads get rejected (413)
- Client `VITE_API_URL` must be set if server runs on non-default host/port
- Refresh token flow redirects to `/login` on failure (full page reload)
- i18n language detection order: `localStorage` then `navigator`; cache key `otb_lang`
- Audit logs retention: `0` keeps logs forever; set to days to enable cleanup
- React client uses React 19 + Compiler; avoid calling setState directly in a `useEffect` body (lint error)

## Module Boundaries
- Server modules under `src/modules/` (e.g., `auth`, `users`, `members`, `meters`, `billing`, `consumption`, `whatsapp`, `notifications`, `audit`, `context`, etc.)
- Each module has its own entities, services, controllers, DTOs
- `StorageService` (S3 uploads) lives in `consumption/` and is exported by `ConsumptionModule`; other modules import `ConsumptionModule` to reuse it (e.g., `BillingModule`)
- PDF receipts (`receipt.service.ts`) are generated with `pdf-lib` from template `src/core/templates/template.pdf` copied to `dist` via `nest-cli.json` assets; `unit`, `e2e`, `start:prod` all run from `dist` so template paths use `__dirname`
- Database entities explicitly listed in `src/database/data-source.ts` (migration source of truth)
- Config modules in `src/config/` provide typed configuration via `ConfigService`

## Development Workflow
1. Ensure Docker is running for database
2. Copy `.env.example` values into `packages/server/.env` and review secrets
3. Run `npm run db:up` and wait for healthcheck
4. Run `npm run dev` (starts both server and client with watch)
5. Access client at http://localhost:5173; API at http://localhost:3001/api
6. Use Swagger UI for API testing (login first to get Bearer token)

## Production Notes
- Set `NODE_ENV=production` to disable TypeORM auto-sync
- Run `npm run build` in both packages before deploying
- Server start: `npm run start:prod` (uses `dist/main`)
- Ensure all env vars are set, especially JWT secrets and DB credentials
- Consider setting `AUDIT_LOG_RETENTION_DAYS` to a positive number
- Configure `CORS_ORIGIN` to actual client URL
