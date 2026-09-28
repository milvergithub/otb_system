# OTB Don Bosco — Sistema de Cobro de Agua

Sistema de administración y cobro de agua para comunidades. NestJS + React + PostgreSQL.

## Requisitos

- Node.js >= 18
- Docker
- PostgreSQL 16

## Quick Start (desarrollo local)

```bash
npm install

# Server: configurar y levantar
cp packages/server/.env.example packages/server/.env
# Editar .env (secrets, DB local)

# Client: configurar
cp packages/client/.env.example packages/client/.env

# Ejecutar ambos en watch
npm run dev
```

- Cliente: http://localhost:5173
- API: http://localhost:3001/api
- Docs: http://localhost:3001/api/docs

## Producción local (Docker, apuntando a DB remota)

### Server

```bash
cd packages/server
cp .env.prod.example .env.prod
# Editar .env.prod con datos reales de producción

npm run docker:up:prod
npm run docker:logs:prod
```

La API queda en http://localhost:3001/api. Las migraciones se ejecutan automáticamente al arrancar.

### Client

```bash
cd packages/client
cp .env.prod.example .env.prod
# Editar .env.prod con la URL de la API de producción

npm run docker:up:prod
```

El frontend queda en http://localhost:8081.

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Server + Client en watch (desarrollo local) |
| `npm run build` | Build ambos packages |
| `npm run lint` | ESLint en todos los workspaces |
| `npm run test` | Jest (solo server) |
| `cd packages/server && npm run docker:up` | API Docker (local, usa `.env`) |
| `cd packages/server && npm run docker:up:prod` | API Docker (producción, usa `.env.prod`) |
| `cd packages/client && npm run docker:up:prod` | Frontend Docker (producción, usa `.env.prod`) |
| `cd packages/server && ENV_FILE=.env.prod npm run migration:run:prod` | Migraciones manuales en prod |

## Entornos

| | Desarrollo local | Producción |
|---|---|---|
| **Server** | `npm run dev` (watch, hot reload) | `docker:up:prod` (contenedor) |
| **Server .env** | `.env` | `.env.prod` |
| **Client** | `npm run dev` (Vite, port 5173) | `docker:up:prod` (nginx, port 8081) |
| **Client .env** | `.env` / `.env.local` | `.env.prod` |
| **DB** | PostgreSQL local (port 5433) | PostgreSQL remota (configurada en `.env.prod`) |

## Variables de entorno

### Server (`packages/server/`)

- `.env` — Desarrollo local (ver `.env.example`)
- `.env.prod` — Producción (ver `.env.prod.example`)

Variables principales: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `RUSTFS_*`, `OPENWA_*`

### Client (`packages/client/`)

- `.env` / `.env.local` — Desarrollo local
- `.env.prod` — Producción (ver `.env.prod.example`)

Variable principal: `VITE_API_URL`

## License

Privado — © OTB Don Bosco
