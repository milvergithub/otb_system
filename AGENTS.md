# AGENTS.md

## Quick Start (desarrollo local)
1. Copy `packages/server/.env.example` values into `packages/server/.env` and adjust secrets
2. Copy `packages/client/.env.example` values into `packages/client/.env`
3. Run `npm run dev` (starts both server and client with watch)
4. API: http://localhost:3001/api — Docs: http://localhost:3001/api/docs

## Quick Start (Docker, local DB)
1. Ensure PostgreSQL is running (port 5433 → 5432)
2. `cd packages/server && npm run docker:up` (builds + runs migrations automatically)
3. API: http://localhost:3001/api

## Repository Structure
- Monorepo using npm workspaces
- `packages/server` — NestJS 11 backend with TypeORM
- `packages/client` — React 19 + Vite 6 frontend (PWA via `vite-plugin-pwa`)
- `packages/landing` — Next.js 16 landing page (port 3002, static content)
- Root scripts orchestrate both packages; `npm run build` builds server then client (not landing)

## Critical Commands
- `npm run dev` — concurrently starts server (`npm:dev:server`) and client (`npm:dev:client`)
- `npm run build` — builds both packages (server then client)
- `npm run lint` — runs ESLint across all workspaces
  - Server lint (`eslint ... --fix`) **rewrites files in place** with `--fix`; client lint does not
  - Client lint fails on `react-hooks/set-state-in-effect` (ERROR) and a few other rules; see Client Specifics
- `npm run test` — runs Jest (server only; client has no test setup)
  - Unit tests live next to the code as `*.spec.ts` (`packages/server/jest.config.js`, rootDir `src`); currently 13 suites / 85 tests covering financial responsibility (scope, access, resolvers, attribution), activities (attendance, evidence, fines, manual fines), initial setup and legacy role sync

## Server Specifics
- Entry: `packages/server/src/main.ts`
- Global prefix: `/api` (e.g., `/api/auth/login`)
- CORS: `CORS_ORIGIN=*` reflects any origin with credentials; comma-separated list = whitelist
- Express body parsers are DISABLED by default; `main.ts` reads `BODY_LIMIT` (default `10mb`) and re-adds `express.json`/`express.urlencoded` with that limit. Base64 images are sent in JSON body, so keep `BODY_LIMIT` high
- Swagger UI: `/api/docs` (Scalar API reference, requires Bearer token)
- Auth: JWT with access (15m) and refresh (7d) tokens
- Database: TypeORM with auto-sync in development (`NODE_ENV !== production`)
- Migrations: `npm run migration:generate`, `migration:run`, `migration:revert` (via `typeorm-ts-node-commonjs -d src/database/data-source.ts`); `migration:run:prod` runs compiled migrations from `dist/`
- Config modules: `src/config/*.config.ts` using `registerAs` pattern (`app`, `database`, `audit`, `openwa`, `logger`; EnvironmentVariables in `.env`)
- Logging: uses nest-winston (winston), JSON format, Console + daily rotate `logs/backend-%DATE%.log` in server cwd; level from `LOG_LEVEL`
- Global providers: `JwtAuthGuard`, `RolesGuard`, `AuditContextInterceptor`, `HttpLogInterceptor`
- Scheduling: `@nestjs/schedule` cron jobs (e.g., billing/notification jobs run at 8am La Paz time); events via `@nestjs/event-emitter` (e.g., `bill.generated`, `payment.completed` → WhatsApp/report flows)
- Financial responsibility (Opción B): `finance_transactions.responsible_user_id` / `collector_user_id` / `registered_by_user_id` + `activities.financial_responsible_user_id`. Every finance read/write endpoint passes a `FinanceAccess` context; without the `finances.all` permission (visibility only) the scope is forced to `responsible_user_id = current user`. All writers (billing, shares, fines, assets, manual) resolve attribution through `FinancialResponsibilityService` — never from roles/permissions/`created_by`; `registered_by_user_id` is always server-set (stripped from DTOs by `whitelist: true`). Configurable responsibles live in settings: `water_bill_responsible_user_id`, `water_share_responsible_user_id`. There is **no Collection/Cash workflow** — `collector_user_id` is only a snapshot field prepared for it

## Initial Setup (first run)
- No admin user is seeded anymore (`SeederService` only seeds permissions + the `admin`/`user` roles; `SEED_ADMIN_*` env vars are gone)
- `setup` module: `GET /setup/status` → `{ setupCompleted }`, `POST /setup/admin` (`fullName`, `email`, `password`, `passwordConfirmation`) → same response as `/auth/login`. Both `@Public()`
- `setupCompleted` = exists an active user with the `admin` Role (`user_roles`) or legacy `users.role = 'admin'`; computed from the DB, never stored
- Creation runs in a transaction guarded by `pg_advisory_xact_lock(SETUP_ADVISORY_LOCK_KEY)` + in-transaction re-check → concurrent requests get `409 Initial setup has already been completed`
- `SeederService` is provided/exported only by `SettingsModule` (`UsersModule` imports it) so seeding runs once per boot
- Legacy `users.role` is derived from RBAC roles via `legacyRoleFromRoles()` (`user.entity.ts`) on every role write (`UsersService.create/update`, `RolesService.assignRolesToUser`, setup): `admin` if the user has the `admin` Role, else `user`
- Client: `SetupGate` (`components/setup-gate.tsx`) wraps all routes and redirects on server status only (`/setup` ↔ rest); after success `applySession` (auth store) + setup-status cache set to completed

## Activities Domain
- Rebuilt in migration `1755000000017-rebuild-activities-domain.ts` and `1755000000018-add-activity-collector.ts` (both additive + idempotent; safe on fresh and legacy DBs)
- Activity sharing was **removed** in migration `1755000000019-drop-activity-shares.ts` (drops `activity_shares`, deletes `activity-share.entity.ts` and the client `share.tsx` page/route). Access is now governed only by `responsible_user_id` visibility + management rules below
- `activities`: `status` (draft → scheduled → in_progress → completed/cancelled, validated transitions via `ActivitiesService.assertTransition`), `type_id` → `activity_types`, `location`, `responsible_user_id` (organizer, **not** financial), `collector_user_id` (user in charge of collecting the activity's fines), `attendance_required`, `fine_enabled`. Legacy `financial_responsible_user_id` is kept as historical data only
- The create/edit form has two user comboboxes — responsable (organizador) and encargado de cobrar multas — both defaulting to the logged-in user (requires `users.read`, hidden/disabled otherwise). The API keeps both optional
- Activities visibility (non-admin): `GET /activities` returns only those where `responsible_user_id = current user` (responsible = organizer). - Management (edit/delete) is allowed for the creator, the activity responsible user (`responsible_user_id`), or users with `activities.all`/admin privileges
- Attendance evaluation (`AttendanceService`): `PRESENT→PRESENT`=present, `ABSENT→PRESENT`=late, `PRESENT→ABSENT`=left_early, `ABSENT→ABSENT`=absent; `excused` is explicit and never fined. Stored in `attendances.result`; legacy `status`/`present_at_*` kept for compatibility and backfilled from `status` on migration
- Controls are sessions: `activity_attendance_sessions` (`initial`/`final`, actor + timestamps) are **upserted**, so re-saving a control updates the same session. `POST /activities/:id/attendance/bulk` takes `{ session, attendance: [{ memberId, status: present|absent|excused }] }` and only touches the submitted members (the `initial-control`/`final-control` endpoints keep marking every member)
- Fines: `fines.source` (attendance|manual|other), `attendance_id`, `created_by_user_id` (server-set), `issued_at`; `fine_types.code` is a free string and `fine_types.applies_to` (absent|late|left_early|any|manual) drives automatic generation. Idempotency comes from the partial unique index `UQ_fines_attendance_fine_type (attendance_id, fine_type_id) WHERE attendance_id IS NOT NULL`; re-evaluating cancels stale `pending` fines instead of duplicating them
- Financial attribution of fine payments (rendición de cuentas): `finance_transactions.responsible_user_id` = the fine's activity `collector_user_id`; `collector_user_id` = explicit `collectorUserId` from the pay request → activity collector → authenticated registrant; `registered_by_user_id` = authenticated user. Resolved per fine in `FinesService.recordFineIncome` (bulk payments spanning activities resolve each fine). Historical movements are never rewritten. The old `activity_fine_responsible_user_id` setting was removed (deleted from `settings` by migration 18)
- `finance_transactions.activity_id` links movements to the activity (fine payments backfilled from `fines.activity_id`); `/finances?activityId=` filters by it
- `activity_evidences` stores only the object key (`activities-evidence/...`); responses add `url` from `StorageService.getPublicUrl()`. Upload failures surface as `503`, not `500`. Evidence uploads accept **only images and PDF** (server rejects `video/*`/other mimes and explicit `type: video` with `400 Solo se permiten imágenes y PDF`; client `accept="image/*,application/pdf"`)
- Endpoints: `GET /activities/:id/summary`, `PATCH /activities/:id/status`, `GET /activities/:id/attendance/sessions`, `/activity-types` CRUD, `/activities/:id/evidence` CRUD, `POST /activities/:id/fines` (manual fines)
- Permissions: `activities.manageAttendance`, `activities.manageFines`, `activities.manageEvidence` (with a temporary fallback to `activities.update`)

## Client Specifics
- Entry: `packages/client/src/main.tsx`
- Vite dev server: port 5173
- API base: `import.meta.env.VITE_API_URL` (defaults to `http://localhost:3001/api`)
- Routing: React Router v6 with lazy-loaded pages and `ProtectedRoute`; activity routes are `/actividades` (list+filters), `/actividades/:id` (detail page with tabs: resumen, asistencia, multas, finanzas, evidencias), `/actividades/:id/asistencia`, `/fines/:memberId`
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
Required (see `packages/server/.env.example` and `packages/client/.env.example` — the running values live in each package's `.env`):
- Database: `DB_HOST`, `DB_PORT` (default 5433), `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- Server: `PORT` (3001), `NODE_ENV`, `CORS_ORIGIN` (optional), `BODY_LIMIT` (default `10mb`)
- JWT: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN` (15m), `JWT_REFRESH_EXPIRES_IN` (7d)
- Audit: `AUDIT_LOG_RETENTION_DAYS` (0 = keep forever)
- Logging: `LOG_LEVEL` (default info)
- OpenWA (WhatsApp): `OPENWA_ENABLED`, `OPENWA_BASE_URL`, `OPENWA_SESSION_ID`, `OPENWA_API_KEY`, `OPENWA_CONSUMPTION_TEMPLATE_ID`, `OPENWA_WELCOME_TEMPLATE_ID`, `OPENWA_METER_REGISTERED_TEMPLATE_ID`, `OPENWA_TIMEOUT_MS`
- Image storage (S3-compatible, used by `StorageService`): `RUSTFS_ENDPOINT`, `RUSTFS_REGION`, `RUSTFS_ACCESS_KEY`, `RUSTFS_SECRET_KEY`, `RUSTFS_BUCKET`, `RUSTFS_PUBLIC_URL` — **not present in `.env.example`**; copy from `packages/server/.env`
- Client: `VITE_API_URL` (in `packages/client/.env.example`)

## Testing
- Server: `npm run test` (unit via `packages/server/jest.config.js`, `testRegex: .*\.spec\.ts`, rootDir `src`), `npm run test:e2e` (e2e with `jest-e2e.json`)
- Jest globals (`describe`/`it`/`expect`/`jest`) are declared for `**/*.spec.ts` in `packages/server/eslint.config.mjs`
- No client test setup present
- Test environment: Node, ts-jest

## Linting & Formatting
- ESLint 9 with `@typescript-eslint` and Prettier integration
- Server: `eslint.config.mjs` (flat config; legacy `.eslintrc.js` also present but unused by ESLint 9) — ignores `dist`, `node_modules`, `.eslintrc.js`; `no-explicit-any` and `no-unused-vars` off, `prettier/prettier` is warn
- Client: `eslint.config.js` (flat config, `eslint-plugin-react-hooks` recommended). **`react-hooks/set-state-in-effect` is treated as an ERROR** and `react-hooks/incompatible-library` is a warning; the client also flags `react-refresh/only-export-components` (warn)
- Prettier: `"prettier/prettier": "warn"` rule enabled

## TypeScript Configuration
- Server: `tsconfig.json` — CommonJS, decorators enabled, outDir `./dist`
- Client: `tsconfig.json` — ESNext, `moduleResolution: bundler`, `noEmit: true`, `jsx: react-jsx`, `strict: true`
- Client also has `tsconfig.app.json` (includes `vite.config.ts`) and `tsconfig.node.json`

## Database
- Docker Compose service `db` (Postgres 16-alpine)
- Container name: `otb-postgres`
- Volume: `otb_pgdata`
- Healthcheck uses `pg_isready`
- TypeORM entities auto-loaded; `synchronize: true` in dev only
- `meter_types.code`: short unique identifier (migration `1755000000020-add-code-to-meter-types.ts`), trimmed/uppercased by `MeterTypesService`, backfilled from `name` with a numeric suffix on collisions; enforced by `UQ_meter_types_code`. Mirrors `activity_types.code`

## API Client Patterns
- Centralized `packages/client/src/lib/api.ts` with axios instance
- Request interceptor adds `Authorization: Bearer <accessToken>`
- Response interceptor handles 401 refresh flow (single concurrent refresh promise)
- Error messages mapped to i18n keys via `EXACT_ERROR_KEYS` and `PREFIX_ERROR_KEYS`
- Token storage keys: `otb_access_token`, `otb_refresh_token`

## Important Gotchas
- Server global prefix `/api` means all routes include it (Swagger setup at `api/docs`)
- CORS: `*` reflects any origin; comma-separated list = whitelist; `credentials: true` always
- The server loads `.env` from `packages/server/.env`, NOT the repo root
- `synchronize: true` in dev auto-creates/alters tables from entities on boot, so `migration:run` is not needed for schema in dev. The dev DB also has a **pre-existing broken migration backlog**: scripts `1755000000007`–`1755000000010` were already applied manually but aren't recorded in the `migrations` table, so running `migration:run` fails (duplicate key on `permissions`). New migrations are fine on a fresh DB
- **Production fresh DB baseline**: `run-migrations.ts` detects a fresh DB (no `users` table) and auto-syncs schema from entities + marks all 21 migrations (1755000000000–1755000000020) as executed. This means the hand-written migrations are **not idempotent** (they assume tables already exist from dev's `synchronize`); the baseline handles this transparently. Requires `uuid-ossp` extension (created automatically if the DB user has superuser privileges — the default `postgres` user does). Migrations run per-transaction (`transaction: 'each'`), not all-at-once
- Image uploads: client sends `imageBase64` (data URL) → server `StorageService.uploadOptimizedImage()` resizes to 1024px JPEG q80 and stores only the object KEY in the DB (`consumptions.image_key`, `payment_history.evidence_key`), not the URL. Keys look like `consumptions/{uuid}.jpg` or `water-actions/evidence/{uuid}.jpg`; full URL = `RUSTFS_PUBLIC_URL/bucket/key`
- `BODY_LIMIT` must stay high (default 10mb) or base64 image payloads get rejected (413)
- Client `VITE_API_URL` must be set if server runs on non-default host/port
- Refresh token flow redirects to `/login` on failure (full page reload)
- i18n language detection order: `localStorage` then `navigator`; cache key `otb_lang`
- Audit logs retention: `0` keeps logs forever; set to days to enable cleanup
- Finance UI user selectors (responsible/collector in forms, settings responsables) call `useSearchUsers` which needs the `users.read` permission — they hide themselves without it
- `finances/reports/water` aggregates `payments`/`consumptions`, not `finance_transactions`, so it is **not** scope-filtered ("my responsibility"); the rest of the finance list/reports/CSV are
- TypeORM caveat: `repo.save()` on an entity with loaded relations silently overwrites changed FK columns with the stale relation objects (hit on `activities.responsible_user_id`/`collector_user_id`); use `repo.update(id, patch)` for raw column updates and re-fetch for the response
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
2. Copy `packages/server/.env.example` values into `packages/server/.env` and review secrets
3. Start database: `cd packages/server && docker compose up -d` (or run your own Postgres)
4. Run `npm run dev` (starts both server and client with watch)
5. Access client at http://localhost:5173; API at http://localhost:3001/api
6. Use Swagger UI for API testing (login first to get Bearer token)

## Production Notes
- Local production: `cd packages/server && docker compose up -d --build` (uses `.env`)
- Server migrations run automatically on container start (via `run-migrations.ts`)
- Set `CORS_ORIGIN` to actual client URL (e.g. `http://<IP>:8081`) or `*` for any origin
- To run migrations manually: `npm run migration:run:prod` (loads `.env` by default; use `ENV_FILE=.env.prod` for prod)
- Docker DB_HOST override: compose overrides `.env` with `host.docker.internal` (Docker Desktop) so the container connects to your host's PostgreSQL instead of itself. `DOCKER_DB_HOST` env var can override this
